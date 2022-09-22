import network from '../network';
import { getEnvironmentConfig } from '../lib/network';

import asyncStorage from './AsyncStorageService';
import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';
import { AsyncStorageKey } from '../types';

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

export interface FileEntry {
  fileId: string;
  file_id: string;
  type: string;
  bucket: string;
  size: number;
  folder_id: string;
  name: string;
  encrypt_version: '03-aes';
}

class UploadService {
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

  public async createFileEntry(entry: FileEntry): Promise<any> {
    const token = (await asyncStorage.getItem(AsyncStorageKey.Token)) as string;
    const headers = await getHeaders(token);
    const body = JSON.stringify({ file: entry });
    const params = { method: 'post', headers, body };

    return fetch(`${constants.DRIVE_API_URL}/storage/file`, params);
  }

  public getFinalUri(fileUri: string, fileType: FileType): string {
    return fileType === 'document' ? decodeURIComponent(fileUri) : fileUri;
  }
}

const uploadService = new UploadService();
export default uploadService;
