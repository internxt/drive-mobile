import { Environment } from '../@inxt-js';
import { ActionState } from '../@inxt-js/api/actionState';
import { FileInfo } from '../@inxt-js/api/fileinfo';
import FileManager from '../@inxt-js/api/FileManager';
import appService from '../services/AppService';

import asyncStorage from '../services/AsyncStorageService';

type ProgressCallback = (progress: number, uploadedBytes: number, totalBytes: number) => void;

interface IDownloadParams {
  fileManager: FileManager;
  progressCallback: ProgressCallback;
}

interface EnvironmentConfig {
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
}

export class Network {
  private environment: Environment;
  private static Errors = {
    BridgeUserNotProvided: 'Bridge user not provided',
    BridgePassNotProvided: 'Bridge pass not provided',
    EncryptKeyNotProvided: 'Mnemonic not provided',
    BucketIdNotProvided: 'Bucket id not provided',
    FileIdNotProvided: 'File id not provided',
  };

  constructor(bridgeUser: string, bridgePass: string, encryptionKey: string) {
    if (!bridgeUser) {
      throw new Error(Network.Errors.BridgeUserNotProvided);
    }

    if (!bridgePass) {
      throw new Error(Network.Errors.BridgePassNotProvided);
    }

    if (!encryptionKey) {
      throw new Error(Network.Errors.EncryptKeyNotProvided);
    }

    this.environment = new Environment({
      bridgePass,
      bridgeUser,
      encryptionKey,
      bridgeUrl: appService.constants.BRIDGE_URL,
    });
  }

  /**
   * Downloads a file from the Internxt Network
   * @param bucketId Bucket where file is uploaded
   * @param fileId Id of the file to be downloaded
   * @param params Required params for downloading a file
   * @returns
   */
  downloadFile(bucketId: string, fileId: string, params: IDownloadParams): [() => void, Promise<void>] {
    let actionState: ActionState;
    const fn = () => {
      return new Promise<void>((resolve, reject) => {
        actionState = this.environment.downloadFile(bucketId, fileId, {
          ...params,
          progressCallback: (progress, bytesReceived, totalBytes) => {
            params.progressCallback(progress, bytesReceived || 0, totalBytes || 0);
          },
          finishedCallback: (err: Error | null) => {
            if (err) {
              return reject(err);
            }
            resolve();
          },
        });
      });
    };

    if (!bucketId) {
      throw new Error(Network.Errors.BucketIdNotProvided);
    }

    if (!fileId) {
      throw new Error(Network.Errors.FileIdNotProvided);
    }

    return [
      () => {
        actionState?.stop();
      },
      fn(),
    ];
  }

  getFileInfo(bucketId: string, fileId: string): Promise<FileInfo> {
    return this.environment.getFileInfo(bucketId, fileId);
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PULL' | 'PUSH'): Promise<string> {
    return this.environment.createFileToken(bucketId, fileId, operation);
  }
}

/**
 * Returns required config to donwload / upload files from / to the Internxt Network
 * @returns
 */
export function getEnvironmentConfig(): Promise<EnvironmentConfig> {
  return asyncStorage.getUser().then((user) => ({
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
  }));
}

export const generateFileKey = Environment.utils.generateFileKey;
