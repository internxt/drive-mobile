import { request } from '@internxt/lib';
import RNFS from 'react-native-fs';
import axios, { AxiosRequestConfig } from 'axios';

import { BucketId, NetworkCredentials } from '../sync/types';
import { GenerateFileKey, ripemd160, sha256 } from '../../@inxt-js/lib/crypto';
import { eachLimit, retry } from 'async';
import { createDecipheriv, Decipher } from 'react-native-crypto';
import RNFetchBlob from 'rn-fetch-blob';
import { FileId } from '@internxt/sdk';

const networkApiUrl = 'https://api.photos.internxt.com';

type FileDecryptedURI = string;

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

function getFileInfo(bucketId: BucketId, fileId: FileId, options?: AxiosRequestConfig): Promise<FileInfo | undefined> {
  return axios.get<FileInfo>(`${networkApiUrl}/buckets/${bucketId}/files/${fileId}/info`, options)
    .then((res) => res.data)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
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

async function decryptFile(
  fromPath: string,
  toPath: string,
  fileSize: number,
  decipher: Decipher
): Promise<FileDecryptedURI> {
  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / chunksOf);

  const URIWhereWriteFile: FileDecryptedURI = toPath;
  const writer = await RNFetchBlob.fs.writeStream(URIWhereWriteFile, 'base64');

  let start = 0;

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RNFS.read(fromPath, twoMb, start, 'base64').then((res) => {
      decipher.write(Buffer.from(res, 'base64'));
      return writer.write(decipher.read().toString('base64'));
    }).then(() => {
      start += twoMb;
      cb(null);
    }).catch((err) => {
      cb(err);
    });
  }).then(() => {
    return writer.close();
  }).then(() => {
    return URIWhereWriteFile;
  });
}

function requestDownloadUrlToFarmer(farmerUrl: string): Promise<string> {
  return axios.get<{ result: string }>(farmerUrl)
    .then((res) => {
      return res.data.result;
    });
}

export async function downloadFile(
  bucketId: BucketId,
  fileId: FileId,
  credentials: NetworkCredentials,
  options: {
    toPath: string,
    progressCallback: (progress: number) => void
  }
): Promise<FileDecryptedURI> {
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
  const fileInfo = await getFileInfo(bucketId, fileId, defaultRequestOptions);

  if (!fileInfo) {
    throw new Error('Download error code 6');
  }

  // console.log(JSON.stringify(fileInfo, null, 2));

  // 2. Get file mirror
  const mirror = await getFileMirror(bucketId, fileId, defaultRequestOptions);

  if (!mirror) {
    throw new Error('Dowload error code 7');
  }

  // console.log(JSON.stringify(mirror, null, 2));

  const farmerUrl = `http://${mirror.farmer.address}:${mirror.farmer.port}/download/link/${mirror.hash}`;
  const downloadUrl = await requestDownloadUrlToFarmer(farmerUrl);

  // 3. Download file
  const encryptedFileURI = (Platform.OS === 'android' ? RNFS.DocumentDirectoryPath : RNFS.MainBundlePath) + mirror.hash + '.enc';

  // console.log('file download started');

  await retry({ times: 3, interval: 500 }, (nextTry) => {
    const downloadResult = RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: encryptedFileURI,
      discretionary: true,
      cacheable: false,
      begin: () => { },
      progress: (res) => {
        options.progressCallback(res.bytesWritten / res.contentLength);
      }
    });

    downloadResult.promise.then(() => {
      return RNFS.hash(encryptedFileURI, 'sha256');
    }).then((sha256hash) => {
      const fileHash = ripemd160(Buffer.from(sha256hash, 'hex')).toString('hex');

      if (fileHash === mirror.hash) {
        nextTry(null);
      } else {
        nextTry(new Error('Hash mismatch'));
      }
    }).catch((err) => {
      nextTry(err);
    });
  });

  // console.log('file download finished');

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

  const fileURI = await decryptFile(encryptedFileURI, options.toPath, fileInfo.size, decipher);

  // Remove encrypted file
  await RNFS.unlink(encryptedFileURI);

  // Move to gallery or return file uri?
  return fileURI;
}