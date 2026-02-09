/**
 * Legacy Network Wrapper
 *
 * @deprecated This class wraps the legacy @inxt-js download system.
 * Only used by downloadLegacy.ts as a final fallback for very old files.
 *
 * Modern downloads should use:
 * - src/network/NetworkFacade.ts (primary)
 * - src/services/NetworkService/download.ts (v1 fallback)
 *
 */

import { Environment } from '../@inxt-js';
import { ActionState } from '../@inxt-js/api/actionState';
import { FileInfo } from '../@inxt-js/api/fileinfo';
import FileManager from '../@inxt-js/api/FileManager';
import appService from '../services/AppService';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

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
}

/**
 * Returns required config data to download/upload files
 *
 * @param user - User data
 * @returns Environment configuration for network operations
 */
export function getEnvironmentConfigFromUser(user: UserSettings): EnvironmentConfig {
  return {
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
  };
}

export const generateFileKey = Environment.utils.generateFileKey;
