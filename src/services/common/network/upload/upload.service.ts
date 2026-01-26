import { getEnvironmentConfigFromUser } from '../../../../lib/network';
import network from '../../../../network';

import {
  CreateThumbnailEntryPayload,
  DriveFileData,
  FileEntryByUuid,
  Thumbnail,
} from '@internxt/sdk/dist/drive/storage/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkManager } from '../../sdk';

export interface FileMeta {
  progress: number;
  currentFolder: number;
  id: string;
  createdAt: Date;
  type: string;
  name: string;
  size: number;
  uri: string;
  lastModified?: number;
  output?: FileList | null;
  path: string;
}

export type FileType = 'document' | 'image';

class UploadService {
  constructor(private sdk: SdkManager) {}

  /**
   * Upload a file to the Internxt network
   *
   * @param file - File metadata including uri, path, etc.
   * @param apiUrl - API URL for the upload
   * @param progressCallback - Callback for upload progress updates
   * @param user - User settings
   * @returns Promise resolving to the uploaded file ID
   */
  public async uploadFile(
    file: FileMeta,
    apiUrl: string,
    progressCallback: (progress: number) => void,
    user: UserSettings,
  ): Promise<string> {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfigFromUser(user);
    const params = { fileUri: file.uri, filepath: file.path, progressCallback };

    return network.uploadFile(
      params.filepath,
      bucketId,
      encryptionKey,
      apiUrl,
      {
        pass: bridgePass,
        user: bridgeUser,
      },
      {
        notifyProgress: progressCallback,
      },
      () => null,
    );
  }

  public async createFileEntry(entry: FileEntryByUuid): Promise<DriveFileData> {
    return this.sdk.storageV2.createFileEntryByUuid(entry);
  }

  public async createThumbnailEntry(entry: CreateThumbnailEntryPayload): Promise<Thumbnail> {
    return this.sdk.storageV2.createThumbnailEntryWithUUID(entry);
  }

  public getFinalUri(fileUri: string, fileType: FileType): string {
    return fileType === 'document' ? decodeURIComponent(fileUri) : fileUri;
  }
}

export const uploadService = new UploadService(SdkManager.getInstance());
