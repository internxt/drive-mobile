import { getEnvironmentConfig } from '../../../../lib/network';
import network from '../../../../network';

import { DriveFileData, FileEntry, Thumbnail, ThumbnailEntry } from '@internxt/sdk/dist/drive/storage/types';
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
  public async uploadFile(
    file: FileMeta,
    apiUrl: string,
    progressCallback: (progress: number) => void,
  ): Promise<string> {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();
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

  public async createFileEntry(entry: FileEntry): Promise<DriveFileData> {
    return this.sdk.storage.createFileEntry(entry);
  }

  public async createThumbnailEntry(entry: ThumbnailEntry): Promise<Thumbnail> {
    return this.sdk.storage.createThumbnailEntry(entry);
  }

  public getFinalUri(fileUri: string, fileType: FileType): string {
    return fileType === 'document' ? decodeURIComponent(fileUri) : fileUri;
  }
}

export const uploadService = new UploadService(SdkManager.getInstance());
