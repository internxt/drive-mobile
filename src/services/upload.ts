import { getEnvironmentConfig, Network } from '../lib/network';
import { deviceStorage } from '../helpers';
import { getHeaders } from '../helpers/headers';

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

export async function uploadFile(file: FileMeta, progressCallback: (progress: number) => void): Promise<string> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();
  const params = { fileUri: file.uri, filepath: file.path, progressCallback };

  return new Network(bridgeUser, bridgePass, encryptionKey).uploadFile(bucketId, params);
}

// TODO: Move to utils or fs
type FileType = 'document' | 'image';

export function getFinalUri(fileUri: string, fileType: FileType): string {
  return fileType === 'document' ? decodeURIComponent(fileUri) : fileUri;
}

export interface FileEntry {
  fileId: string;
  // eslint-disable-next-line camelcase
  file_id: string;
  type: string;
  bucket: string;
  size: number;
  // eslint-disable-next-line camelcase
  folder_id: string;
  name: string;
  // eslint-disable-next-line camelcase
  encrypt_version: '03-aes';
}

export async function createFileEntry(entry: FileEntry): Promise<any> {
  const { mnemonic } = await deviceStorage.getUser();
  const token = await deviceStorage.getToken();

  const headers = await getHeaders(token, mnemonic);
  const body = JSON.stringify({ file: entry });
  const params = { method: 'post', headers, body };

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/file`, params);
}
