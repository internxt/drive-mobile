import { decryptFile, encryptFile } from '@internxt/rn-crypto';
import { randomBytes } from 'react-native-crypto';
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
import appService from '../services/AppService';
import { getAuthFromCredentials, NetworkCredentials } from './requests';
import fileSystemService from '../services/FileSystemService';
import { driveEvents } from '@internxt-mobile/services/drive/events';

export interface DownloadFileParams {
  toPath: string;
  downloadProgressCallback: (progress: number) => void;
  decryptionProgressCallback: (progress: number) => void;
  signal?: AbortSignal;
}

type UploadOptions = {
  progress?: (progress: number) => void;
};

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
        userId: auth.password,
      },
    ),
  );
}

const MINIMUM_SIZE_FOR_ENCRYPTION_PROGRESS = 300 * 1024 * 1024;

export class NetworkFacade {
  private cryptoLib: Crypto;

  constructor(private network: Network) {
    this.cryptoLib = {
      algorithm: ALGORITHMS.AES256CTR,
      validateMnemonic,
      generateFileKey: (mnemonic, bucketId, index) => {
        return generateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes,
    };
  }

  async upload(
    bucketId: string,
    mnemonic: string,
    filePath: string,
    options: UploadOptions,
  ): Promise<[Promise<string>, Abortable]> {
    let currentProgress = 0;

    const maxEncryptProgress = 0.5;
    let fileHash: string;

    const updateProgress = (progress: number) => {
      currentProgress = progress;
      options.progress && options.progress(currentProgress);
    };
    const plainFilePath = filePath;

    const encryptedFilePath = fileSystemService.tmpFilePath(`${uuid.v4()}.enc`);

    const encryptFileFunction = Platform.OS === 'android' ? androidEncryptFileFromFs : iosEncryptFileFromFs;
    const stat = await RNFS.stat(plainFilePath);
    const fileSize = stat.size;
    const shouldEnableEncryptionProgress = fileSize >= MINIMUM_SIZE_FOR_ENCRYPTION_PROGRESS;

    const uploadFilePromise = uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      fileSize,
      async (algorithm, key, iv) => {
        let interval: NodeJS.Timeout | null = null;
        if (shouldEnableEncryptionProgress)
          // TODO: Use real progress passing a callback to the native module
          interval = setInterval(() => {
            currentProgress += 0.001;
            if (currentProgress <= maxEncryptProgress) {
              updateProgress(currentProgress);
            } else if (interval !== null) {
              clearInterval(interval);
            }
          }, 100);

        await encryptFileFunction(plainFilePath, encryptedFilePath, key as Buffer, iv as Buffer);
        // Clear the encrypt progress
        if (interval !== null) {
          interval !== null && clearInterval(interval);
          updateProgress(maxEncryptProgress);
        }

        fileHash = ripemd160(Buffer.from(await RNFS.hash(encryptedFilePath, 'sha256'), 'hex')).toString('hex');
      },
      async (url: string) => {
        await RNFetchBlob.fetch(
          'PUT',
          url,
          {
            'Content-Type': 'application/octet-stream',
          },
          RNFetchBlob.wrap(encryptedFilePath),
        ).uploadProgress({ interval: 150 }, (bytesSent, totalBytes) => {
          // From 0 to 1
          const uploadProgress = bytesSent / totalBytes;

          if (shouldEnableEncryptionProgress) {
            updateProgress(maxEncryptProgress + uploadProgress * maxEncryptProgress);
          } else {
            updateProgress(uploadProgress);
          }
        });

        return fileHash;
      },
    );

    const cleanup = async () => {
      const exists = await fileSystemService.exists(encryptedFilePath);
      // Remove the encrypted version
      exists && (await fileSystemService.unlink(encryptedFilePath));
    };

    const wrapUploadWithCleanup = async () => {
      try {
        const fileId = await uploadFilePromise;
        return fileId;
      } finally {
        // Cleanup always even if the upload fails
        await cleanup();
      }
    };

    return [wrapUploadWithCleanup(), () => null];
  }

  download(fileId: string, bucketId: string, mnemonic: string, params: DownloadFileParams): [Promise<void>, Abortable] {
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

    const decryptFileFromFs: DecryptFileFromFsFunction =
      Platform.OS === 'android' ? androidDecryptFileFromFs : iosDecryptFileFromFs;

    let encryptedFileURI: string | undefined;

    const downloadPromise = downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        encryptedFileURI = fileSystemService.tmpFilePath(`${fileId}.enc`);

        downloadJob = RNFS.downloadFile({
          fromUrl: downloadables[0].url,
          toFile: encryptedFileURI,
          discretionary: true,
          cacheable: false,
          progressDivider: 5,
          progressInterval: 150,
          begin: () => {
            params.downloadProgressCallback(0);
          },
          progress: (res) => {
            params.downloadProgressCallback(res.bytesWritten / res.contentLength);
          },
        });

        driveEvents.setJobId(downloadJob.jobId);
        expectedFileHash = downloadables[0].hash;
      },
      async (_, key, iv) => {
        if (!encryptedFileURI) throw new Error('No encrypted file URI found');
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
          key as Buffer,
          iv as Buffer,
          params.decryptionProgressCallback,
        );

        params.decryptionProgressCallback(1);
      },
    );

    const cleanup = async () => {
      if (!encryptedFileURI) return;
      const exists = await fileSystemService.exists(encryptedFileURI);
      // Remove the encrypted version
      exists && (await fileSystemService.unlink(encryptedFileURI));
    };

    const wrapDownloadWithCleanup = async () => {
      try {
        const fileId = await downloadPromise;
        return fileId;
      } finally {
        // Cleanup always even if the download fails
        await cleanup();
      }
    };

    return [wrapDownloadWithCleanup(), () => RNFS.stopDownload(downloadJob.jobId)];
  }
}

type DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer,
  progress?: (progress: number) => void,
) => Promise<void>;

const androidDecryptFileFromFs: DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer,
) => {
  return new Promise((resolve, reject) => {
    decryptFile(originPath, destinationPath, key.toString('hex'), iv.toString('hex'), (err) => {
      if (err) {
        reject(err);
      } else resolve();
    });
  });
};

const iosDecryptFileFromFs: DecryptFileFromFsFunction = (
  originPath: string,
  destinationPath: string,
  key: Buffer,
  iv: Buffer,
) => {
  return new Promise((resolve, reject) => {
    decryptFile(originPath, destinationPath, key.toString('hex'), iv.toString('hex'), async (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

type EncryptFileFromFsFunction = (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer,
  progress?: (progress: number) => void,
) => Promise<void>;

const androidEncryptFileFromFs: EncryptFileFromFsFunction = (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    encryptFile(plainFilePath, encryptedFilePath, key.toString('hex'), iv.toString('hex'), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const iosEncryptFileFromFs: EncryptFileFromFsFunction = async (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    encryptFile(plainFilePath, encryptedFilePath, key.toString('hex'), iv.toString('hex'), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
