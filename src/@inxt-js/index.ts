import { download } from './lib/download';
import { GenerateFileKey } from './lib/crypto';
import { logger } from './lib/utils/logger';

import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { ActionState, ActionTypes } from './api/actionState';
import { FileManager } from '../services/fileSystem';
import { FileInfo, GetFileInfo } from './api/fileinfo';
import { Bridge, CreateFileTokenResponse } from './services/api';

export type OnlyErrorCallback = (err: Error | null) => void;
export type UploadFinishCallback = (err: Error | null, response: string | null) => void;
export type DownloadFinishedCallback = (err: Error | null) => void;
export type DownloadProgressCallback = (
  progress: number,
  downloadedBytes: number | null,
  totalBytes: number | null,
) => void;
export type DecryptionProgressCallback = (
  progress: number,
  decryptedBytes: number | null,
  totalBytes: number | null,
) => void;
export type UploadProgressCallback = (
  progress: number,
  uploadedBytes: number | null,
  totalBytes: number | null,
) => void;

export interface ResolveFileOptions {
  progressCallback: DownloadProgressCallback;
  finishedCallback: OnlyErrorCallback;
  overwritte?: boolean;
}

export interface DownloadFileOptions {
  fileManager: FileManager;
  progressCallback: DownloadProgressCallback;
  decryptionProgressCallback?: DecryptionProgressCallback;
  finishedCallback: DownloadFinishedCallback;
}

const utils = {
  generateFileKey: GenerateFileKey,
};

export class Environment {
  protected config: EnvironmentConfig;

  static utils = utils;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  setEncryptionKey(newEncryptionKey: string): void {
    this.config.encryptionKey = newEncryptionKey;
  }

  downloadFile(bucketId: string, fileId: string, options: DownloadFileOptions): ActionState {
    const downloadState = new ActionState(ActionTypes.Download);

    if (!this.config.encryptionKey) {
      options.finishedCallback(Error(ENCRYPTION_KEY_NOT_PROVIDED));
      return downloadState;
    }

    if (!bucketId) {
      options.finishedCallback(Error(BUCKET_ID_NOT_PROVIDED));
      return downloadState;
    }

    download(this.config, bucketId, fileId, options.progressCallback, logger, downloadState, options.fileManager)
      .then(() => {
        options.finishedCallback(null);
      })
      .catch((err) => {
        options.finishedCallback(err);
      });

    return downloadState;
  }

  /**
   * Gets file info
   * @param bucketId Bucket id where file is stored
   * @param fileId
   * @returns file info
   */
  getFileInfo(bucketId: string, fileId: string): Promise<FileInfo> {
    return GetFileInfo(this.config, bucketId, fileId);
  }

  /**
   * Creates file token
   * @param bucketId Bucket id where file is stored
   * @param fileId File id
   * @param operation
   * @param cb
   */
  createFileToken(bucketId: string, fileId: string, operation: 'PUSH' | 'PULL'): Promise<string> {
    return new Bridge(this.config)
      .createFileToken(bucketId, fileId, operation)
      .start<CreateFileTokenResponse>()
      .then((res) => {
        return res.token;
      });
  }
}

export interface EnvironmentConfig {
  bridgeUrl?: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey?: string;
  logLevel?: number;
  webProxy?: string;
  useProxy?: boolean;
  config?: {
    shardRetry: number;
  };
}
