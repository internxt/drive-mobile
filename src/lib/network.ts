import { createHash } from 'react-native-crypto';
import RNFetchBlob from 'rn-fetch-blob';
import { Environment } from '../@inxt-js';
import { FileInfo } from '../@inxt-js/api/fileinfo';

import { deviceStorage } from '../services/deviceStorage';
import { FileManager } from './fs';

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;

interface IUploadParams {
  filepath: string;
  fileUri: string;
  progressCallback: ProgressCallback;
}

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
  private bridgeUrl = 'https://api.internxt.com';
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

    this.environment = new Environment({ bridgePass, bridgeUser, encryptionKey, bridgeUrl: this.bridgeUrl });
  }

  /**
   * Uploads a file to the Internxt Network
   * @param bucketId Bucket where file is going to be uploaded
   * @param params Required params for uploading a file
   * @returns Id of the created file
   */
  async uploadFile(bucketId: string, params: IUploadParams): Promise<string> {
    if (!bucketId) {
      throw new Error(Network.Errors.BucketIdNotProvided);
    }

    const fileUri = params.fileUri;

    const fileSize = parseInt((await RNFetchBlob.fs.stat(fileUri)).size);
    const filename = createHash('ripemd160').update(params.filepath).digest('hex');

    return new Promise((resolve: (fileId: string) => void, reject) => {
      this.environment.uploadFile(bucketId, {
        filename,
        fileSize,
        fileUri,
        progressCallback: params.progressCallback,
        finishedCallback: (err, fileId) => {
          if (err) {
            return reject(err);
          }

          resolve(fileId);
        },
      });
    });
  }

  /**
   * Downloads a file from the Internxt Network
   * @param bucketId Bucket where file is uploaded
   * @param fileId Id of the file to be downloaded
   * @param params Required params for downloading a file
   * @returns
   */
  downloadFile(bucketId: string, fileId: string, params: IDownloadParams): Promise<void> {
    if (!bucketId) {
      throw new Error(Network.Errors.BucketIdNotProvided);
    }

    if (!fileId) {
      throw new Error(Network.Errors.FileIdNotProvided);
    }

    return new Promise((resolve, reject) => {
      this.environment.downloadFile(bucketId, fileId, {
        ...params,
        finishedCallback: (err: Error | null) => {
          if (err) {
            return reject(err);
          }
          resolve();
        },
      });
    });
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
  return deviceStorage.getUser().then((user) => ({
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
  }));
}

export const generateFileKey = Environment.utils.generateFileKey;
