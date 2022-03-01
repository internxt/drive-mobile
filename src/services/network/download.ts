import { request } from '@internxt/lib';
import RNFS from 'react-native-fs';
import axios, { AxiosRequestConfig } from 'axios';
import RNFetchBlob from 'rn-fetch-blob';
import { createDecipheriv } from 'react-native-crypto';

import { GenerateFileKey, ripemd160, sha256 } from '../../@inxt-js/lib/crypto';

import { eachLimit, retry } from 'async';
import { FileId } from '@internxt/sdk/dist/photos';
import { getDocumentsDir } from '../fileSystem';
import { NetworkCredentials } from '../../types';
import { Platform } from 'react-native';
import { decryptFile as nativeDecryptFile } from 'rn-crypto';

type FileDecryptedURI = string;

export class LegacyDownloadRequiredError extends Error {
  constructor() {
    super('Old download required');
  }
}

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

function getFileInfo(
  bucketId: string,
  fileId: FileId,
  networkApiUrl: string,
  options?: AxiosRequestConfig,
): Promise<FileInfo | undefined> {
  return axios
    .get<FileInfo>(`${networkApiUrl}/buckets/${bucketId}/files/${fileId}/info`, options)
    .then((res) => res.data)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function getFileMirrors(
  bucketId: string,
  fileId: FileId,
  networkApiUrl: string,
  options?: AxiosRequestConfig,
): Promise<Shard[]> {
  const requestUrl = `${networkApiUrl}/buckets/${bucketId}/files/${fileId}?limit=3&skip=0`;

  return axios
    .get<Shard[]>(requestUrl, options)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

async function decryptFile(
  fromPath: string,
  toPath: string,
  fileSize: number,
  fileDecryptionKey: Buffer,
  iv: Buffer,
  options?: {
    progress: (progress: number) => void;
  },
): Promise<FileDecryptedURI> {
  const decipher = createDecipheriv('aes-256-ctr', fileDecryptionKey.slice(0, 32), iv);
  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / chunksOf);

  const URIWhereWriteFile: FileDecryptedURI = toPath;
  const writer = await RNFetchBlob.fs.writeStream(URIWhereWriteFile, 'base64');

  let start = 0;

  options?.progress(0);

  if (Platform.OS === 'android') {
    return new Promise((resolve, reject) => {
      nativeDecryptFile(fromPath, toPath, fileDecryptionKey.toString('hex'), iv.toString('hex'), (err) => {
        if (err) {
          return reject(err);
        }
        options?.progress(1);
        resolve(toPath);
      });
    });
  }

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RNFS.read(fromPath, twoMb, start, 'base64')
      .then((res) => {
        decipher.write(Buffer.from(res, 'base64'));
        return writer.write(decipher.read().toString('base64'));
      })
      .then(() => {
        start += twoMb;
        options?.progress(Math.min(start / fileSize, 1));
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  })
    .then(() => {
      return writer.close();
    })
    .then(() => {
      return URIWhereWriteFile;
    });
}

function requestDownloadUrlToFarmer(farmerUrl: string): Promise<string> {
  const targetUrl = 'https://proxy01.api.internxt.com/' + farmerUrl;

  return axios.get<{ result: string }>(targetUrl).then((res) => {
    return res.data.result;
  });
}

export async function downloadFile(
  bucketId: string,
  fileId: FileId,
  credentials: NetworkCredentials,
  networkApiUrl: string,
  options: {
    toPath: string;
    downloadProgressCallback: (progress: number) => void;
    decryptionProgressCallback: (progress: number) => void;
  },
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

  if (!credentials.password) {
    throw new Error('Download error code 4');
  }

  if (!credentials.user) {
    throw new Error('Download error code 5');
  }

  const defaultRequestOptions: AxiosRequestConfig = {
    auth: {
      username: credentials.user,
      password: sha256(Buffer.from(credentials.password)).toString('hex'),
    },
  };

  // 1. Get file info
  const fileInfo = await getFileInfo(bucketId, fileId, networkApiUrl, defaultRequestOptions);

  if (!fileInfo) {
    throw new Error('Download error code 6');
  }

  // 2. Get file mirror
  const mirrors = await getFileMirrors(bucketId, fileId, networkApiUrl, defaultRequestOptions);

  if (mirrors.length === 0) {
    throw new Error('Dowload error code 7');
  }

  if (mirrors.length > 1) {
    throw new LegacyDownloadRequiredError();
  }

  const [mirror] = mirrors;

  const farmerUrl = `http://${mirror.farmer.address}:${mirror.farmer.port}/download/link/${mirror.hash}`;
  const downloadUrl = await requestDownloadUrlToFarmer(farmerUrl);

  // 3. Download file
  const encryptedFileURI = getDocumentsDir() + '/' + mirror.hash + '.enc';

  await retry({ times: 3, interval: 500 }, (nextTry) => {
    const downloadResult = RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: encryptedFileURI,
      discretionary: true,
      cacheable: false,
      begin: () => undefined,
      progressInterval: 500,
      progress: (res) => {
        options.downloadProgressCallback(res.bytesWritten / res.contentLength);
      },
    });

    downloadResult.promise
      .then(() => {
        return RNFS.hash(encryptedFileURI, 'sha256');
      })
      .then((sha256hash) => {
        const fileHash = ripemd160(Buffer.from(sha256hash, 'hex')).toString('hex');

        if (fileHash === mirror.hash) {
          nextTry(null);
        } else {
          nextTry(new Error('Hash mismatch'));
        }
      })
      .catch((err) => {
        nextTry(err);
      });
  });

  options.downloadProgressCallback(1);

  // 4. Decrypt file
  const fileDecryptionKey = await GenerateFileKey(
    credentials.encryptionKey,
    bucketId,
    Buffer.from(fileInfo.index, 'hex'),
  );

  const fileURI = await decryptFile(
    encryptedFileURI,
    options.toPath,
    fileInfo.size,
    fileDecryptionKey.slice(0, 32),
    Buffer.from(fileInfo.index, 'hex').slice(0, 16),
    {
      progress: options.decryptionProgressCallback,
    },
  );

  await RNFS.unlink(encryptedFileURI).catch(() => null);

  return fileURI;
}
