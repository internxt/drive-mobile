import { randomBytes, createCipheriv, Cipher } from 'react-native-crypto';
import RFNS from 'react-native-fs';
import { eachLimit } from 'async';
import RNFetchBlob from 'rn-fetch-blob';
import uuid from 'react-native-uuid';
import axios, { AxiosRequestConfig } from 'axios';
import { request } from '@internxt/lib';

import { GenerateFileKey, ripemd160, sha256, sha512HmacBuffer, EncryptFilename } from '../../@inxt-js/lib/crypto';
import { getDocumentsDir } from '../fileSystem';
import { ShardMeta } from '../../@inxt-js/lib/shardMeta';
import { FileId } from '@internxt/sdk/dist/photos';
import { NetworkCredentials, NetworkUser } from '../../types';

import { encryptFile as nativeEncryptFile } from 'rn-crypto';
import { Platform } from 'react-native';

type FrameId = string;
type Timestamp = string;
type BucketEntryId = string;
type FileEncryptedURI = string;

interface Contract {
  hash: string;
  token: string;
  operation: 'PUSH';
  url: string;
  farmer: {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: number;
  };
}

interface Frame {
  id: FrameId;
  user: NetworkUser;
  shards: [];
  storageSize: number;
  size: number;
  locked: boolean;
  created: Timestamp;
}

interface CreateEntryFromFrameBody {
  frame: string;
  filename: string;
  index: string;
  hmac: {
    type: string;
    value: string;
  };
  erasure?: {
    type: string;
  };
}

interface CreateEntryFromFrameResponse {
  id: string;
  index: string;
  frame: string;
  bucket: string;
  mimetype: string;
  name: string;
  renewal: string;
  created: string;
  hmac: {
    value: string;
    type: string;
  };
  erasure: {
    type: string;
  };
  size: number;
}

interface MerkleTree {
  leaf: string[];
  challenges: Buffer[];
  challenges_as_str: string[];
  preleaf: Buffer[];
}

function generateMerkleTree(): MerkleTree {
  return {
    leaf: [
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000',
      '0000000000000000000000000000000000000000',
    ],
    challenges: [
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex'),
      Buffer.from('00000000000000000000000000000000', 'hex'),
    ],
    challenges_as_str: [
      '00000000000000000000000000000000',
      '00000000000000000000000000000000',
      '00000000000000000000000000000000',
      '00000000000000000000000000000000',
    ],
    preleaf: [
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
    ],
  };
}

function bucketExists(bucketId: string, networkUrl: string, options?: AxiosRequestConfig): Promise<boolean> {
  return axios
    .get(`${networkUrl}/buckets/${bucketId}`, options)
    .then(() => true)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function stageFile(networkUrl: string, options?: AxiosRequestConfig): Promise<FrameId> {
  return axios
    .post<Frame>(`${networkUrl}/frames`, {}, options)
    .then((res) => res.data.id)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function negotiateContract(
  frameId: FrameId,
  shardMeta: ShardMeta,
  networkUrl: string,
  options?: AxiosRequestConfig,
): Promise<Contract> {
  return axios
    .request<Contract>({
      ...options,
      method: 'PUT',
      data: {
        ...shardMeta,
        challenges: shardMeta.challenges_as_str,
      },
      url: `${networkUrl}/frames/${frameId}`,
    })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function generateHmac(encryptionKey: Buffer, shardMetas: ShardMeta[]): string {
  const shardMetasCopy = [...shardMetas].sort((sA, sB) => sA.index - sB.index);
  const hmac = sha512HmacBuffer(encryptionKey);

  for (const shardMeta of shardMetasCopy) {
    hmac.update(Buffer.from(shardMeta.hash, 'hex'));
  }

  return hmac.digest().toString('hex');
}

function createBucketEntry(
  bucketId: string,
  frameId: FrameId,
  filename: string,
  encryptionKey: Buffer,
  index: Buffer,
  shardMetas: ShardMeta[],
  networkUrl: string,
  options: AxiosRequestConfig,
): Promise<BucketEntryId> {
  const hmac = generateHmac(encryptionKey, shardMetas);
  const newBucketEntry = generateBucketEntry(frameId, filename, index, hmac);

  return axios
    .post<CreateEntryFromFrameResponse>(`${networkUrl}/buckets/${bucketId}/files`, newBucketEntry, options)
    .then((res) => {
      return res.data.id;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function generateBucketEntry(
  frameId: FrameId,
  filename: string,
  index: Buffer,
  hmac: string,
): CreateEntryFromFrameBody {
  const bucketEntry: CreateEntryFromFrameBody = {
    frame: frameId,
    filename,
    index: index.toString('hex'),
    hmac: { type: 'sha512', value: hmac },
  };

  return bucketEntry;
}

function generateCipher(key: Buffer, iv: Buffer): Cipher {
  return createCipheriv('aes-256-ctr', key, iv);
}

async function encryptFile(
  fileUri: string,
  fileSize: number,
  fileEncryptionKey: Buffer,
  iv: Buffer
): Promise<FileEncryptedURI> {
  const fileEncryptedURI: FileEncryptedURI = getDocumentsDir() + '/' + uuid.v4() + '.enc';

  if (Platform.OS === 'android') {
    return new Promise((resolve, reject) => nativeEncryptFile(
      fileUri,
      fileEncryptedURI,
      fileEncryptionKey.toString('hex'),
      iv.toString('hex'),
      (err: Error) => {
        if (err) {
          return reject(err);
        }
        return resolve(fileEncryptedURI);
      }
    ));
  }

  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / chunksOf);
  const writer = await RNFetchBlob.fs.writeStream(fileEncryptedURI, 'base64');
  const cipher = generateCipher(fileEncryptionKey, iv);
  let start = 0;

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RFNS.read(fileUri, chunksOf, start, 'base64')
      .then((res) => {
        cipher.write(Buffer.from(res, 'base64'));
        return writer.write(cipher.read().toString('base64'));
      })
      .then(() => {
        start += twoMb;
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
      return fileEncryptedURI;
    });
}

interface UploadOpts {
  progress: (processPercentage: number) => void;
}

export async function uploadFile(
  fileURI: string,
  bucketId: string,
  networkUrl: string,
  credentials: NetworkCredentials,
  uploadOptions?: UploadOpts,
): Promise<FileId> {
  if (!bucketId) {
    throw new Error('Upload error code 1');
  }

  if (!credentials.encryptionKey) {
    throw new Error('Upload error code 2');
  }

  if (!credentials.user) {
    throw new Error('Upload error code 3');
  }

  if (!credentials.password) {
    throw new Error('Upload error code 4');
  }

  const filename = await EncryptFilename(credentials.encryptionKey, bucketId, uuid.v4().toString());

  const defaultRequestOptions: AxiosRequestConfig = {
    auth: {
      username: credentials.user,
      password: sha256(Buffer.from(credentials.password)).toString('hex'),
    },
  };

  // 1. Check bucket existence
  const exists = await bucketExists(bucketId, networkUrl, defaultRequestOptions);

  if (!exists) {
    throw new Error('Upload error code 5');
  }

  // 2. Stage frame
  const frameId = await stageFile(networkUrl, defaultRequestOptions);

  // 3. Generate cipher
  const index: Buffer = randomBytes(32);
  const fileEncryptionKey = await GenerateFileKey(credentials.encryptionKey, bucketId, index);

  // 4. Encrypt file
  const fileStats = await RFNS.stat(fileURI);
  const fileSize = parseInt(fileStats.size);
  const fileEncryptedURI = await encryptFile(
    fileURI,
    fileSize,
    fileEncryptionKey,
    index.slice(0, 16)
  );

  const fileHash = ripemd160(Buffer.from(await RFNS.hash(fileEncryptedURI, 'sha256'), 'hex'));
  const merkleTree = generateMerkleTree();
  const shardMetas: ShardMeta[] = [
    {
      index: 0,
      hash: fileHash.toString('hex'),
      parity: false,
      size: fileSize,
      tree: merkleTree.leaf,
      challenges_as_str: merkleTree.challenges_as_str,
    },
  ];

  // 5. Negotiate contract
  const contract = await negotiateContract(frameId, shardMetas[0], networkUrl, defaultRequestOptions);

  // 6. Upload
  await RNFetchBlob.fetch(
    'PUT',
    contract.url,
    {
      'Content-Type': 'application/octet-stream',
    },
    RNFetchBlob.wrap(fileEncryptedURI),
  ).uploadProgress({ interval: 250 }, (bytesSent, totalBytes) => {
    uploadOptions?.progress(bytesSent / totalBytes);
  });

  // 7. Create file entry
  return createBucketEntry(
    bucketId,
    frameId,
    filename,
    fileEncryptionKey,
    index,
    shardMetas,
    networkUrl,
    defaultRequestOptions,
  );
}
