import network from '../network';
import { getEnvironmentConfig } from '../lib/network';

import { asyncStorage } from './asyncStorage';
import { getHeaders } from '../helpers/headers';
import { constants } from './app';
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

type FileType = 'document' | 'image';

export async function uploadFile(file: FileMeta, apiUrl: string, progressCallback: (progress: number) => void): Promise<string> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();
  const params = { fileUri: file.uri, filepath: file.path, progressCallback };

  return network.uploadFile(
    params.filepath,
    bucketId,
    encryptionKey,
    apiUrl,
    {
      pass: bridgePass,
      user: bridgeUser
    },
    {
      notifyProgress: progressCallback
    },
    () => null
  );
}

export function getFinalUri(fileUri: string, fileType: FileType): string {
  return fileType === 'document' ? decodeURIComponent(fileUri) : fileUri;
}

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

export async function createFileEntry(entry: FileEntry): Promise<any> {
  const { mnemonic } = await asyncStorage.getUser();
  const token = (await asyncStorage.getItem(AsyncStorageKey.Token)) as string;
  const headers = await getHeaders(token, mnemonic);
  const body = JSON.stringify({ file: entry });
  const params = { method: 'post', headers, body };

  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/file`, params);
}
