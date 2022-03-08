import { getEnvironmentConfig, Network } from '../lib/network';
import { deviceStorage } from './asyncStorage';
import { getHeaders } from '../helpers/headers';
import { constants } from './app';

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

export async function uploadFile(file: FileMeta, progressCallback: (progress: number) => void): Promise<string | null> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();
  const params = { fileUri: file.uri, filepath: file.path, progressCallback };

  return new Network(bridgeUser, bridgePass, encryptionKey).uploadFile(bucketId, params);
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
  const { mnemonic } = await deviceStorage.getUser();
  const token = (await deviceStorage.getToken()) as string;

  const headers = await getHeaders(token, mnemonic);
  const body = JSON.stringify({ file: entry });
  const params = { method: 'post', headers, body };

  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/file`, params);
}
