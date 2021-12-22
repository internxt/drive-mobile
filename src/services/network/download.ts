import { request } from '@internxt/lib';
import RFNS from 'react-native-fs';
import axios, { AxiosRequestConfig } from 'axios';

import { BucketId, FileId, NetworkCredentials } from '.';
import { GenerateFileKey, ripemd160, sha256 } from '../../@inxt-js/lib/crypto';
import { wrap } from '../../@inxt-js/lib/utils/error';
import { retry } from 'async';
import { createDecipheriv, Decipher } from 'react-native-crypto';

const networkApiUrl = 'https://api.photos.internxt.com';

interface FileInfo {
  bucket: string;
  mimetype: string;
  filename: string;
  frame: string;
  size: number;
  id: string;
  created: Date;
  hmac: {
    value: string;
    type: string;
  };
  erasure?: {
    type: string;
  };
  index: string;
}

interface Shard {
  index: number;
  replaceCount: number;
  hash: string;
  size: number;
  parity: boolean;
  token: string;
  healthy?: boolean;
  farmer: {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: Date;
  };
  operation: string;
}

function getFileInfo(): Promise<FileInfo | undefined> {

}

function getFileMirror(bucketId: BucketId, fileId: FileId, options?: AxiosRequestConfig): Promise<Shard | null> {
  const requestUrl = `${networkApiUrl}/buckets/${bucketId}/files/${fileId}?limit=1&skip=0`;

  return axios.get<Shard[]>(requestUrl, options)
    .then((res) => {
      return res.data.length === 0 ? null : res.data[0];
    })
    .catch((err) => {
      // TODO: Wrap
      throw new Error(request.extractMessageFromError(err));
    });
}

function generateDecipher(key: Buffer, iv: Buffer): Decipher {
  return createDecipheriv('aes-256-ctr', key, iv);
}

function decryptFile(encryptedFileURI: string, fileSize: string, decipher: Decipher): Promise<void> {
  // 1. Create decipher
}

function downloadEncryptedFile() {

}

export async function downloadFile(bucketId: BucketId, fileId: FileId, credentials: NetworkCredentials) {
  if (!bucketId) {
    throw new Error('Download error code 1');
  }

  if (!fileId) {
    throw new Error('Download error code 2');
  }

  if (!credentials.encryptionKey) {
    throw new Error('Download error code 3');
  }

  if (!credentials.pass) {
    throw new Error('Download error code 4');
  }

  if (!credentials.user) {
    throw new Error('Download error code 5');
  }

  const defaultRequestOptions: AxiosRequestConfig = {
    auth: {
      username: credentials.user,
      password: sha256(Buffer.from(credentials.pass)).toString('hex')
    }
  };

  // 1. Get file info
  const fileInfo = await getFileInfo(fileId, defaultRequestOptions);

  if (!fileInfo) {
    throw new Error('Download error code 6');
  }

  // 2. Get file mirror
  const mirror = await getFileMirror(bucketId, fileId, defaultRequestOptions);

  if (!mirror) {
    throw new Error('Dowload error code 7');
  }

  const farmerUrl = `http://${mirror.farmer.address}:${mirror.farmer.port}/download/link/${mirror.hash}`;

  // 3. Download file
  // Get uri for storing the file
  const encryptedFileURI = '';

  await retry({ times: 3, interval: 500 }, (nextTry) => {
    const downloadResult = RFNS.downloadFile({
      fromUrl: farmerUrl,
      toFile: encryptedFileURI,
      discretionary: true,
      cacheable: false
    });

    downloadResult.promise.then(() => {
      return RFNS.hash(encryptedFileURI, 'sha256');
    }).then((sha256hash) => {
      const fileHash = ripemd160(sha256hash).toString('hex');

      if (fileHash === mirror.hash) {
        nextTry(null);
      } else {
        nextTry(new Error('Hash mismatch'));
      }
    }).catch((err) => {
      nextTry(err);
    });
  });

  // 4. Decrypt file
  const fileDecryptionKey = await GenerateFileKey(
    credentials.encryptionKey, 
    bucketId, 
    Buffer.from(fileInfo.index, 'hex')
  );

  const decipher = createDecipheriv(
    'aes-256-ctr',
    fileDecryptionKey.slice(0, 32),
    Buffer.from(fileInfo.index, 'hex').slice(0, 16)
  );



  // Remove encrypted file
  await RFNS.unlink(encryptedFileURI);
}