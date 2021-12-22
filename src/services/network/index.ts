import { randomBytes, createCipheriv, Cipher } from 'react-native-crypto';
import RFNS, { UploadFileItem } from 'react-native-fs';
import { eachLimit } from 'async';
import uuid from 'react-native-uuid';
import axios, { AxiosRequestConfig } from 'axios';
import { request } from '@internxt/lib';

import { GenerateFileKey, ripemd160, sha256, sha512HmacBuffer } from '../../@inxt-js/lib/crypto';
import { getDocumentsDir } from '../../lib/fs';
import { ShardMeta } from '../../@inxt-js/lib/shardMeta';

// const networkApiUrl = process.env.NETWORK_PHOTOS_API_URL as string;
const networkApiUrl = 'https://api.photos.internxt.com';

type FrameId = string;
export type FileId = string;
export type BucketId = string;
type Mnemonic = string;
type Timestamp = string;
type NetworkUser = string;
type NetworkPass = string;
type BucketEntryId = string;
type FileEncryptedURI = string;

export interface NetworkCredentials {
  encryptionKey: Mnemonic
  user: NetworkUser
  pass: NetworkPass
}

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
  }
  erasure?: {
    type: string;
  }
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

function bucketExists(bucketId: BucketId, options?: AxiosRequestConfig): Promise<boolean> {
  return axios.get(`${networkApiUrl}/buckets/${bucketId}`, options)
    .then(() => true)
    .catch((err) => {
      // TODO: Wrap
      throw err;
    });
}

function stageFile(options?: AxiosRequestConfig): Promise<FrameId> {
  return axios.post<Frame>(`${networkApiUrl}/frames`, {}, options)
    .then((res) => res.data.id)
    .catch((err) => {
      // TODO: Wrap
      throw err;
    });
}

function negotiateContract(frameId: FrameId, shardMeta: ShardMeta, options?: AxiosRequestConfig): Promise<Contract> {  
  return axios.request<Contract>({
    ...options,
    method: 'PUT',
    data: {
      ...shardMeta, challenges: shardMeta.challenges_as_str
    },
    url: `${networkApiUrl}/frames/${frameId}`,
  }).then((res) => {
    return res.data;
  }).catch((err) => {
    console.log(request.extractMessageFromError(err));
    throw err;
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

async function createBucketEntry(frameId: FrameId, encryptionKey: Buffer, index: Buffer, shardMetas: ShardMeta[]): Promise<BucketEntryId> {
  const hmac = generateHmac(encryptionKey, shardMetas);
  // TODO: Encrypt this
  const filename = uuid.v4().toString();

  const newBucketEntry = generateBucketEntry(frameId, filename, index, hmac, false);
  // TODO: Make bridge request
}

function generateBucketEntry(
  frameId: FrameId,
  filename: string,
  index: Buffer,
  hmac: string,
  rs: boolean,
): CreateEntryFromFrameBody {
  const bucketEntry: CreateEntryFromFrameBody = {
    frame: frameId,
    filename,
    index: index.toString('hex'),
    hmac: { type: 'sha512', value: hmac },
  };

  if (rs) {
    bucketEntry.erasure = { type: 'reedsolomon' };
  }

  return bucketEntry;
}

function generateCipher(key: Buffer, iv: Buffer): Cipher {
  return createCipheriv('aes-256-ctr', key, iv);
}

function encryptFile(fileUri: string, fileSize: number, cipher: Cipher): Promise<FileEncryptedURI> {
  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / twoMb);

  let start = 0;

  const fileEncryptedURI: FileEncryptedURI = getDocumentsDir() + 'hola.enc';

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RFNS.read(fileUri, chunksOf, start, 'base64')
      .then((res) => {
        cipher.write(Buffer.from(res, 'base64'));
        start += twoMb;
        return RFNS.appendFile(fileEncryptedURI, cipher.read().toString('base64'), 'base64');
      })
      .then(() => cb(null))
      .catch(cb);
  }).then(() => {
    return fileEncryptedURI;
  });
}

export async function uploadFile(fileURI: string, bucketId: BucketId, credentials: NetworkCredentials): Promise<FileId> {
  if (!bucketId) {
    throw new Error('Upload error code 1');
  }

  if (!credentials.encryptionKey) {
    throw new Error('Upload error code 2');
  }

  if (!credentials.user) {
    throw new Error('Upload error code 3');
  }

  if (!credentials.pass) {
    throw new Error('Upload error code 4');
  }

  const defaultRequestOptions: AxiosRequestConfig = {
    auth: {
      username: credentials.user,
      password: sha256(Buffer.from(credentials.pass)).toString('hex')
    }
  };

  // 1. Check bucket existence
  const exists = await bucketExists(bucketId, defaultRequestOptions);

  if (!exists) {
    throw new Error('Bucket not exists');
  }

  // 2. Stage frame
  const frameId = await stageFile(defaultRequestOptions);

  // 3. Generate cipher
  const index = randomBytes(32);
  const fileEncryptionKey = await GenerateFileKey(credentials.encryptionKey, bucketId, index);
  const cipher = generateCipher(fileEncryptionKey, index.slice(0, 16));

  // 4. Encrypt file
  const fileStats = await RFNS.stat(fileURI);
  const fileSize = parseInt(fileStats.size);
  const fileEncryptedURI = await encryptFile(fileURI, fileSize, cipher);

  // TODO: Buffer from what? Hex?
  const fileHash = ripemd160(
    Buffer.from(await RFNS.hash(fileEncryptedURI, 'sha256'), 'hex')
  );

  console.log('fileHash is ' + fileHash.toString('hex'));

  const merkleTree = generateMerkleTree();
  const shardMetas: ShardMeta[] = [{
    index: 0,
    hash: fileHash.toString('hex'),
    parity: false,
    size: fileSize,
    tree: merkleTree.leaf,
    challenges_as_str: merkleTree.challenges_as_str,
  }];

  console.log(JSON.stringify(shardMetas[0], null, 2));

  console.log('negotiating contract');

  // 5. Negotiate contract
  const contract = await negotiateContract(frameId, shardMetas[0], defaultRequestOptions);

  console.log('negotiated contract');
  console.log(JSON.stringify(contract, null, 2));

  // 6. Upload file
  const files: UploadFileItem[] = [{
    filename: '',
    filepath: fileEncryptedURI,
    filetype: '',
    name: ''
  }];

  const uploadResult = RFNS.uploadFiles({
    toUrl: contract.url,
    // binaryStreamOnly
    files,
    method: 'PUT',
    progress: (res) => {
      console.log('PROGRESS ' + ((res.totalBytesSent / res.totalBytesExpectedToSend) * 100).toFixed(2));
    }
  });

  await uploadResult.promise;

  // 7. Create file entry
  return createBucketEntry(frameId, fileEncryptionKey, index, shardMetas);
}
