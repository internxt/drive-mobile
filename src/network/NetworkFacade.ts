import * as RNFS from '@dr.pogodin/react-native-fs';
import { logger } from '@internxt-mobile/services/common';
import { decryptFile, encryptFile, joinFiles } from '@internxt/rn-crypto';
import { ALGORITHMS, Network } from '@internxt/sdk/dist/network';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { Crypto } from '@internxt/sdk/dist/network/types';
import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { Platform } from 'react-native';
import { validateMnemonic } from 'react-native-bip39';
import { randomBytes } from 'react-native-crypto';
import uuid from 'react-native-uuid';
import RNFetchBlob from 'rn-fetch-blob';

import drive from '@internxt-mobile/services/drive';
import { ripemd160 } from '../@inxt-js/lib/crypto';
import { generateFileKey } from '../lib/network';
import appService from '../services/AppService';
import { driveEvents } from '../services/drive/events';
import fileSystemService from '../services/FileSystemService';
import { Abortable } from '../types';
import { EncryptedFileDownloadedParams } from './download';
import { getAuthFromCredentials, NetworkCredentials } from './requests';

const HUNDRED_MB = 100 * 1024 * 1024;

export interface DownloadFileParams {
  toPath: string;
  downloadProgressCallback: (progress: number, bytesReceived: number, totalBytes: number) => void;
  decryptionProgressCallback: (progress: number) => void;
  onEncryptedFileDownloaded?: ({ path, name }: EncryptedFileDownloadedParams) => Promise<void>;
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
        let interval: number | null = null;
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
      throw new Error('Missing file id in download');
    }

    if (!bucketId) {
      throw new Error('Missing bucket id in download');
    }

    if (!mnemonic) {
      throw new Error('Missing mnemonic in download');
    }

    let downloadJob: { jobId: number; promise: Promise<RNFS.DownloadResultT> };
    let expectedFileHash: string;

    const decryptFileFromFs: DecryptFileFromFsFunction =
      Platform.OS === 'android' ? androidDecryptFileFromFs : iosDecryptFileFromFs;

    let encryptedFileURI: string | undefined;

    const encryptedFileName = `${fileId}.enc`;
    let encryptedFileIsCached = false;
    let totalBytes = 0;
    const downloadPromise = downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        /**
         * TODO make this product agnostic, right now we
         * use the Drive FileCacheManager, but Photos
         * uses this download function too, is not a problem
         * since the fileID is an unique key, but we should
         * improve this
         */
        const { isCached, path } = await drive.cache.isCached(encryptedFileName);

        if (isCached) {
          encryptedFileIsCached = true;
          encryptedFileURI = path;
        } else {
          encryptedFileURI = fileSystemService.tmpFilePath(encryptedFileName);
          // Create an empty file so RNFS can write to it directly
          await fileSystemService.createEmptyFile(encryptedFileURI);

          downloadJob = RNFS.downloadFile({
            fromUrl: downloadables[0].url,
            toFile: encryptedFileURI,
            discretionary: true,
            cacheable: false,
            progressDivider: 5,
            progressInterval: 150,
            begin: () => {
              params.downloadProgressCallback(0, 0, 0);
            },
            progress: (res) => {
              if (res.contentLength) {
                totalBytes = res.contentLength;
              }
              params.downloadProgressCallback(
                res.bytesWritten / res.contentLength,
                res.bytesWritten,
                res.contentLength,
              );
            },
          });

          driveEvents.setJobId(downloadJob.jobId);
          expectedFileHash = downloadables[0].hash;
        }
      },
      async (_, key, iv) => {
        if (!encryptedFileURI) throw new Error('No encrypted file URI found');

        // Maybe we should save the expected hash and compare even if the file is cached
        if (!encryptedFileIsCached) {
          await downloadJob.promise;
          const sha256Hash = await RNFS.hash(encryptedFileURI, 'sha256');
          const receivedFileHash = ripemd160(Buffer.from(sha256Hash, 'hex')).toString('hex');

          if (receivedFileHash !== expectedFileHash) {
            throw new Error('Hash mismatch');
          }
        }

        params.downloadProgressCallback(1, totalBytes, totalBytes);

        // The encrypted file should exists at this path and has size, otherwise something went wrong
        const encryptedFileExists = await fileSystemService.fileExistsAndIsNotEmpty(encryptedFileURI);

        if (!encryptedFileExists) throw new Error('An error ocurred while downloading the file');

        await decryptFileFromFs(
          encryptedFileURI,
          params.toPath,
          key as Buffer,
          iv as Buffer,
          params.decryptionProgressCallback,
        );

        if (params.onEncryptedFileDownloaded) {
          await params.onEncryptedFileDownloaded({
            path: encryptedFileURI,
            name: encryptedFileName,
          });
        }

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
      } catch (err) {
        // If the "download" failed and the file is cached, remove the cached file
        if (encryptedFileIsCached) {
          await drive.cache.removeCachedFile(encryptedFileName);
        }
        throw err;
      } finally {
        // Cleanup always even if the download fails
        await cleanup();
      }
    };

    return [wrapDownloadWithCleanup(), () => RNFS.stopDownload(downloadJob.jobId)];
  }

  downloadMultipart(
    fileId: string,
    bucketId: string,
    mnemonic: string,
    params: DownloadFileParams,
    fileSize: number,
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

    let isAborting = false;

    const downloadJobs: {
      [key: number]: {
        jobId: number;
        promise: Promise<RNFS.DownloadResultT>;
        bytesWritten: number;
      };
    } = {};

    let expectedFileHash: string;
    const CONCURRENT_DOWNLOADS = 3;

    const decryptFileFromFs: DecryptFileFromFsFunction =
      Platform.OS === 'android' ? androidDecryptFileFromFs : iosDecryptFileFromFs;

    let encryptedFileURI: string | undefined;
    const encryptedFileName = `${fileId}.enc`;
    let encryptedFileIsCached = false;

    let chunkFiles: string[] = [];

    const cleanupChunks = async () => {
      if (chunkFiles.length > 0) {
        await Promise.all(chunkFiles.map((file) => fileSystemService.deleteFile([file])));
        chunkFiles = [];
      }
    };

    const abortDownload = async () => {
      if (isAborting) return;
      isAborting = true;

      try {
        await Promise.all(Object.values(downloadJobs).map((job) => RNFS.stopDownload(job.jobId)));

        await cleanupChunks();

        if (encryptedFileURI && !encryptedFileIsCached) {
          const exists = await fileSystemService.exists(encryptedFileURI);
          if (exists) {
            await fileSystemService.unlink(encryptedFileURI);
          }
        }
      } catch (error) {
        logger.error('Error during abort cleanup:', JSON.stringify(error));
      }
    };

    const cleanupExistingChunks = async (encFileName: string) => {
      try {
        const tmpDir = fileSystemService.getTemporaryDir();
        const files = await RNFS.readDir(tmpDir);
        const chunkPattern = new RegExp(`${encFileName}\\-chunk-\\d+$`);

        const existingChunks = files.filter((file) => chunkPattern.test(file.name));
        if (existingChunks.length > 0) {
          await Promise.all(existingChunks.map((file) => fileSystemService.deleteFile([file.path])));
        }
      } catch (error) {
        logger.error('Error cleaning up existing chunks:', JSON.stringify(error));
      }
    };

    if (params.signal) {
      params.signal.addEventListener('abort', abortDownload);
    }

    const downloadChunk = async (
      url: string,
      range: { start: number; end: number },
      chunkIndex: number,
    ): Promise<string> => {
      const chunkFileName = `${encryptedFileName}-chunk-${chunkIndex + 1}`;
      const chunkFileURI = fileSystemService.tmpFilePath(chunkFileName);
      chunkFiles.push(chunkFileURI);

      await fileSystemService.createEmptyFile(chunkFileURI);

      downloadJobs[chunkIndex] = {
        jobId: -1,
        promise: Promise.resolve({} as RNFS.DownloadResultT),
        bytesWritten: 0,
      };

      const downloadJob = RNFS.downloadFile({
        fromUrl: url,
        toFile: chunkFileURI,
        discretionary: true,
        cacheable: false,
        headers: {
          Range: `bytes=${range.start}-${range.end}`,
        },
        progressDivider: 5,
        progressInterval: 150,
        begin: () => {
          if (chunkIndex === 0) {
            params.downloadProgressCallback(0, 0, 0);
          }
        },
        progress: (res) => {
          downloadJobs[chunkIndex].bytesWritten = res.bytesWritten;

          const currentTotalBytes = Object.values(downloadJobs).reduce((acc, job) => {
            return acc + job.bytesWritten;
          }, 0);
          params.downloadProgressCallback(currentTotalBytes / fileSize, currentTotalBytes, fileSize);
        },
      });

      downloadJobs[chunkIndex].jobId = downloadJob.jobId;
      downloadJobs[chunkIndex].promise = downloadJob.promise;
      driveEvents.setJobId(downloadJob.jobId);

      try {
        await downloadJob.promise;
        return chunkFileURI;
      } catch (error) {
        await fileSystemService.deleteFile([chunkFileURI]);
        throw error;
      }
    };

    const downloadPromise = downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        const { isCached, path } = await drive.cache.isCached(encryptedFileName);

        if (isCached) {
          encryptedFileIsCached = true;
          encryptedFileURI = path;
        } else {
          await cleanupExistingChunks(encryptedFileName);
          const downloadChunkSize = HUNDRED_MB;
          const ranges: { start: number; end: number }[] = [];

          for (let start = 0; start < fileSize; start += downloadChunkSize) {
            const end = Math.min(start + downloadChunkSize - 1, fileSize - 1);
            ranges.push({ start, end });
          }

          params.downloadProgressCallback(0, 0, 0);

          for (let i = 0; i < ranges.length; i += CONCURRENT_DOWNLOADS) {
            if (isAborting || params.signal?.aborted) {
              throw new Error('Download aborted');
            }

            const currentBatch = ranges.slice(i, i + CONCURRENT_DOWNLOADS);
            const batchPromises = currentBatch.map((range, index) =>
              downloadChunk(downloadables[0].url, range, i + index),
            );

            try {
              await Promise.all(batchPromises);
            } catch (error) {
              await cleanupChunks();
              if (isAborting) {
                throw new Error('Download aborted');
              }
              throw error;
            }

            if (Platform.OS === 'ios') {
              const completedBytes = Math.min((i + CONCURRENT_DOWNLOADS) * downloadChunkSize, fileSize);
              params.downloadProgressCallback(completedBytes / fileSize, completedBytes, fileSize);
            }
          }

          expectedFileHash = downloadables[0].hash;
          encryptedFileURI = fileSystemService.tmpFilePath(encryptedFileName);

          joinFiles(chunkFiles, encryptedFileURI, async (error) => {
            if (error) {
              logger.error('Error on joinFiles in download function:', JSON.stringify(error));
              throw error;
            }

            await cleanupChunks();
          });
        }
      },
      async (_, key, iv) => {
        if (!encryptedFileURI) throw new Error('No encrypted file URI found');
        if (isAborting || params.signal?.aborted) {
          throw new Error('Download aborted');
        }
        // commented because it is giving errors, we should check if it is necessary
        // Maybe we should save the expected hash and compare even if the file is cached
        // if (!encryptedFileIsCached) {
        //   await downloadJob.promise;
        //   const sha256Hash = await RNFS.hash(encryptedFileURI, 'sha256');
        //   const receivedFileHash = ripemd160(Buffer.from(sha256Hash, 'hex')).toString('hex');

        //   if (receivedFileHash !== expectedFileHash) {
        //     throw new Error('Hash mismatch');
        //   }
        // }

        params.downloadProgressCallback(1, fileSize, fileSize);

        await decryptFileFromFs(
          encryptedFileURI,
          params.toPath,
          key as Buffer,
          iv as Buffer,
          params.decryptionProgressCallback,
        );

        if (params.onEncryptedFileDownloaded) {
          await params.onEncryptedFileDownloaded({
            path: encryptedFileURI,
            name: encryptedFileName,
          });
        }

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
      } catch (err) {
        // If the "download" failed and the file is cached, remove the cached file
        if (encryptedFileIsCached) {
          await drive.cache.removeCachedFile(encryptedFileName);
        }
        throw err;
      } finally {
        // Cleanup always even if the download fails
        await cleanup();
      }
    };

    return [wrapDownloadWithCleanup(), abortDownload];
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
