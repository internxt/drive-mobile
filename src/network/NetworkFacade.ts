import * as RNFS from '@dr.pogodin/react-native-fs';
import { logger } from '@internxt-mobile/services/common';
import { decryptFile, encryptFile, encryptFileToChunks, joinFiles } from '@internxt/rn-crypto';
import { ALGORITHMS, Network } from '@internxt/sdk/dist/network';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { BinaryData, Crypto } from '@internxt/sdk/dist/network/types';
import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { Platform } from 'react-native';
import { validateMnemonic } from 'react-native-bip39';
import { randomBytes } from 'react-native-crypto';
import uuid from 'react-native-uuid';
import ReactNativeBlobUtil from 'react-native-blob-util';

import drive from '@internxt-mobile/services/drive';
import pLimit, { LimitFunction } from 'p-limit';
import { ripemd160 } from '../@inxt-js/lib/crypto';
import { generateFileKey } from '../lib/network';
import appService from '../services/AppService';
import { driveEvents } from '../services/drive/events';
import fileSystemService from '../services/FileSystemService';
import { Abortable } from '../types';
import { EncryptedFileDownloadedParams } from './download';
import { getAuthFromCredentials, NetworkCredentials } from './requests';

interface UploadMultipartOptions {
  partSize: number;
  uploadingCallback?: (progress: number) => void;
  abortController?: AbortSignal;
  continueUploadOptions?: {
    taskId: string;
  };
}

interface PartInfo {
  PartNumber: number;
  ETag: string;
}

type EncryptFileFunction = (algorithm: string, key: BinaryData, iv: BinaryData) => Promise<void>;

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
        await ReactNativeBlobUtil.fetch(
          'PUT',
          url,
          {
            'Content-Type': 'application/octet-stream',
          },
          ReactNativeBlobUtil.wrap(encryptedFilePath),
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

  async uploadMultipart(
    bucketId: string,
    mnemonic: string,
    filePath: string,
    options: UploadMultipartOptions,
  ): Promise<string> {
    const CONCURRENT_UPLOADS = 6;
    const limit = pLimit(CONCURRENT_UPLOADS);

    const uploadState = {
      partsUploadedBytes: {} as Record<number, number>,
      fileParts: [] as PartInfo[],
      fileHash: '',
    };

    const fileInfo = await this.getFileInfo(filePath, options.partSize);
    const encryptedPartPaths = this.createEncryptedPartPaths(fileInfo.parts);
    const uploadMultipart = async (urls: string[]) => {
      await this.processUploadParts(urls, encryptedPartPaths, uploadState, limit, fileInfo.size, options);
      uploadState.fileHash = await this.calculateFileHash(encryptedPartPaths);

      return {
        hash: uploadState.fileHash,
        parts: uploadState.fileParts.sort((a, b) => a.PartNumber - b.PartNumber),
      };
    };
    try {
      return await uploadMultipartFile(
        this.network,
        this.cryptoLib,
        bucketId,
        mnemonic,
        fileInfo.size,
        this.createEncryptFunction(filePath, encryptedPartPaths, options.partSize),
        uploadMultipart,
        fileInfo.parts,
      );
    } finally {
      await this.cleanupEncryptedFiles(encryptedPartPaths);
    }
  }

  private async getFileInfo(filePath: string, partSize: number) {
    const stat = await RNFS.stat(filePath);
    return {
      size: stat.size,
      parts: Math.ceil(stat.size / partSize),
    };
  }

  private createEncryptedPartPaths(parts: number): string[] {
    return Array.from(
      { length: parts },
      (_, index) => `${RNFS.TemporaryDirectoryPath}/encrypted_${Date.now()}_${index}`,
    );
  }

  private createEncryptFunction(filePath: string, encryptedPaths: string[], partSize: number): EncryptFileFunction {
    return async (_, key, iv) => {
      return new Promise((resolve, reject) => {
        encryptFileToChunks(
          filePath,
          encryptedPaths,
          (key as Buffer).toString('hex'),
          (iv as Buffer).toString('hex'),
          partSize,
          (error: Error | null) => (error ? reject(error) : resolve()),
        );
      });
    };
  }

  private async processUploadParts(
    urls: string[],
    encryptedPaths: string[],
    uploadState: {
      partsUploadedBytes: Record<number, number>;
      fileParts: PartInfo[];
      fileHash: string;
    },
    limit: LimitFunction,
    fileSize: number,
    options: UploadMultipartOptions,
  ): Promise<void> {
    const uploadWithRetry = async (path: string, url: string, index: number): Promise<PartInfo> => {
      try {
        const result = await this.uploadPart(
          url,
          path,
          index,
          uploadState.partsUploadedBytes,
          fileSize,
          options.uploadingCallback,
        );
        return result;
      } catch (error) {
        logger.error(`First attempt failed for part ${index + 1}, retrying...`);
        try {
          const retryResult = await this.uploadPart(
            url,
            path,
            index,
            uploadState.partsUploadedBytes,
            fileSize,
            options.uploadingCallback,
          );
          return retryResult;
        } catch (retryError) {
          logger.error(`Retry failed for part ${index + 1}`);
          throw retryError;
        }
      }
    };

    const uploadTasks = encryptedPaths.map((path, index) =>
      limit(async () => {
        const partInfo = await uploadWithRetry(path, urls[index], index);
        uploadState.fileParts.push(partInfo);
        return partInfo;
      }),
    );

    await Promise.all(uploadTasks);
  }

  private async uploadPart(
    url: string,
    encryptedPartPath: string,
    index: number,
    partsUploadedBytes: Record<number, number>,
    fileSize: number,
    progressCallback?: (progress: number) => void,
  ): Promise<PartInfo> {
    try {
      const response = await ReactNativeBlobUtil.fetch(
        'PUT',
        url,
        { 'Content-Type': 'application/octet-stream' },
        ReactNativeBlobUtil.wrap(encryptedPartPath),
      ).uploadProgress({ interval: 150 }, (sent: number) => {
        this.updateUploadProgress(index, parseInt(sent.toString()), partsUploadedBytes, fileSize, progressCallback);
      });

      const etag = Platform.OS === 'android' ? response.info().headers.ETag : response.info().headers.Etag;
      if (!etag) throw new Error('Missing ETag in upload response');

      return {
        PartNumber: index + 1,
        ETag: etag,
      };
    } catch (error) {
      logger.error(`Error uploading part ${index + 1}:`, error);
      throw error;
    }
  }

  private updateUploadProgress(
    partId: number,
    uploadedBytes: number,
    partsUploadedBytes: Record<number, number>,
    fileSize: number,
    progressCallback?: (progress: number) => void,
  ): void {
    partsUploadedBytes[partId] = uploadedBytes;
    const totalUploaded = Object.values(partsUploadedBytes).reduce((a, p) => a + p, 0);
    progressCallback?.(totalUploaded / fileSize);
  }

  private async calculateFileHash(encryptedPaths: string[]): Promise<string> {
    const allPartsHash = await Promise.all(encryptedPaths.map((path) => RNFS.hash(path, 'sha256')));
    return ripemd160(Buffer.from(allPartsHash.join(''), 'hex')).toString('hex');
  }

  private async cleanupEncryptedFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(async (path) => {
        const exists = await fileSystemService.exists(path);
        if (exists) {
          await fileSystemService.unlink(path);
        }
      }),
    );
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
    const CONCURRENT_DOWNLOADS = Platform.OS === 'android' ? 3 : 6;
    const limit = pLimit(CONCURRENT_DOWNLOADS);

    const downloadJobs: {
      [key: number]: {
        jobId: number;
        promise: Promise<RNFS.DownloadResultT>;
        bytesWritten: number;
      };
    } = {};

    let expectedFileHash: string;

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
          if (Platform.OS === 'android') {
            downloadJobs[chunkIndex].bytesWritten = res.bytesWritten;

            const currentTotalBytes = Object.values(downloadJobs).reduce((acc, job) => {
              return acc + job.bytesWritten;
            }, 0);
            params.downloadProgressCallback(currentTotalBytes / fileSize, currentTotalBytes, fileSize);
          }
        },
      });

      downloadJobs[chunkIndex].jobId = downloadJob.jobId;
      downloadJobs[chunkIndex].promise = downloadJob.promise;
      driveEvents.setJobId(downloadJob.jobId);

      try {
        await downloadJob.promise;

        if (Platform.OS === 'ios') {
          downloadJobs[chunkIndex].bytesWritten = range.end - range.start;
          const currentTotalBytes = Object.values(downloadJobs).reduce((acc, job) => acc + job.bytesWritten, 0);
          const normalizedProgress = Math.min(currentTotalBytes, fileSize);
          params.downloadProgressCallback(normalizedProgress / fileSize, normalizedProgress, fileSize);
        }
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
        const MEGA_BYTE = 1 * 1024 * 1024;

        const { isCached, path } = await drive.cache.isCached(encryptedFileName);

        if (isCached) {
          encryptedFileIsCached = true;
          encryptedFileURI = path;
        } else {
          await cleanupExistingChunks(encryptedFileName);

          // temporary workaround to display the progress of the download more continuously in iOS
          const downloadChunkSize = Platform.OS === 'android' ? 100 * MEGA_BYTE : 25 * MEGA_BYTE;
          const ranges: { start: number; end: number }[] = [];

          for (let start = 0; start < fileSize; start += downloadChunkSize) {
            const end = Math.min(start + downloadChunkSize - 1, fileSize - 1);
            ranges.push({ start, end });
          }

          params.downloadProgressCallback(0, 0, 0);

          try {
            const downloadTasks = ranges.map((range, index) =>
              limit(() => downloadChunk(downloadables[0].url, range, index)),
            );

            await Promise.all(downloadTasks);
          } catch (error) {
            await cleanupChunks();
            if (isAborting) {
              throw new Error('Download aborted');
            }
            throw error;
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
