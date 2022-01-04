import RFNS, { UploadFileItem } from 'react-native-fs';
import { randomBytes, createCipheriv } from 'react-native-crypto';
import { eachLimit } from 'async';

import { getEnvironmentConfig, Network } from '../lib/network';
import { deviceStorage } from '../services/deviceStorage';
import { getHeaders } from '../helpers/headers';
import { getDocumentsDir } from '../lib/fs';

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

  return fetch(`${process.env.REACT_NATIVE_DRIVE_API_URL}/api/storage/file`, params);
}

export async function uploadFileV2(fileUri: string): Promise<void> {
  console.log('hola 1');
  const fileEncryptionKey = randomBytes(32);
  // const cipher = forge.cipher.createCipher('AES-CTR', fileEncryptionKey);

  const index = randomBytes(32);
  const cipher = createCipheriv('aes-256-ctr', fileEncryptionKey, index.slice(0, 16));

  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  console.log(fileUri);
  const fileStats = await RFNS.stat(fileUri);
  console.log('fileSize of', fileStats.size);

  const chunks = Math.ceil(parseInt(fileStats.size) / twoMb);
  console.log('CHUNKS:', chunks);
  console.log('CHUNKS ARRAY:' + new Array(chunks).length);
  console.log('STARTING ENCRYPTION');

  let start = 0;

  await eachLimit(new Array(chunks), 1, (_, cb) => {
    RFNS.read(fileUri, chunksOf, start, 'base64')
      .then((res) => {
        cipher.write(Buffer.from(res, 'base64'));
        start += twoMb;
        return RFNS.appendFile(getDocumentsDir() + 'hola.enc', cipher.read().toString('base64'), 'base64');
      })
      .then(() => cb(null))
      .catch(cb);
  });

  const files: UploadFileItem[] = [];

  const uploadResult = RFNS.uploadFiles({
    toUrl: 's3url',
    // binaryStreamOnly
    files,
    method: 'POST',
    progress: (res) => {
      console.log(((res.totalBytesSent / res.totalBytesExpectedToSend) * 100).toFixed(2));
    },
  });

  // RFNS.stopUpload(uploadResult.jobId);

  console.log('FINISHING ENCRYPTION');
}
