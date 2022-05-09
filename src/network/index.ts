import { decryptFile, encryptFile } from 'rn-crypto';
import { randomBytes, createCipheriv } from 'react-native-crypto';
import { Platform } from 'react-native';
import * as RNFS from 'react-native-fs';
import RNFetchBlob from 'rn-fetch-blob';
import uuid from 'react-native-uuid';
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
import { pathToUri } from '../services/fileSystem';
import { eachLimit } from 'async';

export interface DownloadFileParams {
  toPath: string;
  downloadProgressCallback: (progress: number) => void;
  decryptionProgressCallback: (progress: number) => void;
  signal?: AbortSignal;
}

type UploadOptions = {
  progress?: (progress: number) => void
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

  async upload(
    bucketId: string,
    mnemonic: string,
    filePath: string,
    options: UploadOptions
  ): Promise<[Promise<string>, Abortable]> {
    let fileHash: string;

    const plainFilePath = filePath;
    const encryptedFilePath = getDocumentsDir() + '/' + uuid.v4() + '.enc';

    const encryptFileFunction = Platform.OS === 'android' ?
      androidEncryptFileFromFs :
      iosEncryptFileFromFs;

    const fileSize = parseInt((await RNFS.stat(plainFilePath)).size);


    const uploadFilePromise = uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      fileSize,
      async (algorithm, key, iv) => {
        await encryptFileFunction(
          plainFilePath,
          encryptedFilePath,
          (key as Buffer),
          (iv as Buffer)
        );

        fileHash = ripemd160(Buffer.from(await RNFS.hash(encryptedFilePath, 'sha256'), 'hex')).toString('hex');
      },
      async (url: string) => {
        await RNFetchBlob.fetch(
          'PUT',
          url,
          {
            'Content-Type': 'application/octet-stream'
          },
          RNFetchBlob.wrap(encryptedFilePath)
        ).uploadProgress({ interval: 500 }, (bytesSent, totalBytes) => {
          options.progress && options.progress(bytesSent / totalBytes);
        });

        return fileHash;
      }
    );

    return [uploadFilePromise, () => null];
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

type EncryptFileFromFsFunction = (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer,
  progress?: (progress: number) => void
) => Promise<void>;

const androidEncryptFileFromFs: EncryptFileFromFsFunction = (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer
): Promise<void> => {
  return new Promise((resolve, reject) => {
    encryptFile(
      plainFilePath,
      encryptedFilePath,
      key.toString('hex'),
      iv.toString('hex'),
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

const iosEncryptFileFromFs: EncryptFileFromFsFunction = async (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer
): Promise<void> => {
  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const fileSize = parseInt((await RNFS.stat(plainFilePath)).size);
  const chunks = Math.ceil(fileSize / chunksOf);
  const writer = await RNFetchBlob.fs.writeStream(encryptedFilePath, 'base64');
  const cipher = createCipheriv('aes-256-ctr', key, iv);
  let start = 0;

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RNFS.read(pathToUri(plainFilePath), chunksOf, start, 'base64')
      .then((res) => {
        cipher.write(Buffer.from(res, 'base64'));
        return writer.write(cipher.read().toString('base64'));
      })
      .then(() => {
        start += twoMb;
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  })
    .then(() => {
      return writer.close();
    });
};
