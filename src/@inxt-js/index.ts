/**
 * @deprecated LEGACY DOWNLOAD SYSTEM
 *
 * This module is maintained for backwards compatibility with old files only.
 * Modern downloads use @internxt/sdk via NetworkFacade.
 *
 * Only used when:
 * 1. File has multiple mirrors (old redundancy system)
 * 2. After modern download and V1 download both fail
 *
 */

import { GenerateFileKey } from './lib/crypto';
import { download } from './lib/download';
import { logger } from './lib/utils/logger';

import { ActionState, ActionTypes } from './api/actionState';
import { BUCKET_ID_NOT_PROVIDED, ENCRYPTION_KEY_NOT_PROVIDED } from './api/constants';
import { FileInfo, GetFileInfo } from './api/fileinfo';
import FileManager from './api/FileManager';

export type DownloadFinishedCallback = (err: Error | null) => void;
export type DownloadProgressCallback = (
  progress: number,
  downloadedBytes: number | null,
  totalBytes: number | null,
) => void;
type DecryptionProgressCallback = (progress: number, decryptedBytes: number | null, totalBytes: number | null) => void;

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
