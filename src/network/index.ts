import { decryptFile } from 'rn-crypto';
import { randomBytes } from 'react-native-crypto';
import { Platform } from 'react-native';
import * as RNFS from 'react-native-fs';
import { validateMnemonic } from 'react-native-bip39';
import { Network, ALGORITHMS } from '@internxt/sdk/dist/network';
import { Crypto } from '@internxt/sdk/dist/network/types';
import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { downloadFile } from '@internxt/sdk/dist/network/download';

import { generateFileKey } from '../lib/network';
import { ripemd160 } from '../@inxt-js/lib/crypto';
import { Abortable } from '../types';
import appService from '../services/app';
import { getAuthFromCredentials, NetworkCredentials } from './requests';
import { decryptFileFromFs } from './crypto';
import { getDocumentsDir } from '../services/fileSystem';

export interface DownloadFileParams {
  toPath: string;
  downloadProgressCallback: (progress: number) => void;
  decryptionProgressCallback: (progress: number) => void;
  signal?: AbortSignal;
}

type UploadOptions = {
  progress: (progress: number) => void
}

export function getNetwork(apiUrl: string, creds: NetworkCredentials): NetworkFacade {
  const auth = getAuthFromCredentials(creds);

  return new NetworkFacade(
    Network.client(
      apiUrl,
      {
        clientName: appService.name,
        clientVersion: appService.version,
      },
      {
        bridgeUser: auth.username,
        userId: auth.password
      }
    )
  );
}

export class NetworkFacade {
  private cryptoLib: Crypto;

  constructor(private network: Network) {
    this.cryptoLib = {
      algorithm: ALGORITHMS.AES256CTR,
      validateMnemonic,
      generateFileKey: (mnemonic, bucketId, index) => {
        return generateFileKey(
          mnemonic,
          bucketId,
          (index as Buffer)
        );
      },
      randomBytes
    };
  }


  download(
    fileId: string,
    bucketId: string,
    mnemonic: string,
    params: DownloadFileParams
  ): [Promise<void>, Abortable] {
    if (!fileId) {
      throw new Error('Download error code 1');
    }

    if (!bucketId) {
      throw new Error('Download error code 2');
    }

    if (!mnemonic) {
      throw new Error('Download error code 3');
    }

    let downloadJob: { jobId: number; promise: Promise<RNFS.DownloadResult> };
    let expectedFileHash: string;

    const decryptFileFromFs: DecryptFileFromFsFunction = Platform.OS === 'android' ?
      androidDecryptFileFromFs :
      iosDecryptFileFromFs;

    let encryptedFileURI: string;

    const downloadPromise = downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        encryptedFileURI = getDocumentsDir() + '/' + downloadables[0].hash + '.enc';

        downloadJob = RNFS.downloadFile({
          fromUrl: downloadables[0].url,
          toFile: encryptedFileURI,
          discretionary: true,
          cacheable: false,
          progress: (res) => {
            params.downloadProgressCallback(res.bytesWritten / res.contentLength);
          }
        });

        expectedFileHash = downloadables[0].hash;
      },
      async (_, key, iv) => {
        await downloadJob.promise;

        const sha256Hash = await RNFS.hash(encryptedFileURI, 'sha256');
        const receivedFileHash = ripemd160(Buffer.from(sha256Hash, 'hex')).toString('hex');

        if (receivedFileHash !== expectedFileHash) {
          throw new Error('Hash mismatch');
        }

        params.downloadProgressCallback(1);

        await decryptFileFromFs(
          encryptedFileURI,
          params.toPath,
          (key as Buffer),
          (iv as Buffer),
          params.decryptionProgressCallback
        );

        params.decryptionProgressCallback(1);
      }
    );

    return [downloadPromise, () => RNFS.stopDownload(downloadJob.jobId)];
  }
}

type DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer,
  progress?: (progress: number) => void
) => Promise<void>;

const androidDecryptFileFromFs: DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer
) => {
  return new Promise((resolve, reject) => {
    decryptFile(
      originPath,
      destinationPath,
      key.toString('hex'),
      iv.toString('hex'),
      (err) => {
        if (err) { reject(err); } else resolve();
      }
    );
  });
};

const iosDecryptFileFromFs: DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer,
  notifyProgress?: (progress: number) => void
) => {
  return decryptFileFromFs(
    originPath,
    destinationPath,
    key,
    iv,
    notifyProgress && { progress: notifyProgress }
  ).then();
};
