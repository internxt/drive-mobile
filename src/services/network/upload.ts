import { randomBytes, createCipheriv, Cipher } from 'react-native-crypto';
import RFNS, { UploadFileItem } from 'react-native-fs';
import { eachLimit } from 'async';
import RNFetchBlob from 'rn-fetch-blob';
import uuid from 'react-native-uuid';
import axios, { AxiosRequestConfig } from 'axios';
import { request } from '@internxt/lib';

import { GenerateFileKey, ripemd160, sha256, sha512HmacBuffer, EncryptFilename } from '../../@inxt-js/lib/crypto';
import { getDocumentsDir } from '../../lib/fs';
import { ShardMeta } from '../../@inxt-js/lib/shardMeta';
import { BucketId, NetworkCredentials, NetworkUser } from '../sync/types';
import { FileId } from '@internxt/sdk';

// const networkApiUrl = process.env.NETWORK_PHOTOS_API_URL as string;
const networkApiUrl = 'https://api.photos.internxt.com';

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
  }
  erasure?: {
    type: string;
  }
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

function bucketExists(bucketId: BucketId, options?: AxiosRequestConfig): Promise<boolean> {
  return axios.get(`${networkApiUrl}/buckets/${bucketId}`, options)
    .then(() => true)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

function stageFile(options?: AxiosRequestConfig): Promise<FrameId> {
  return axios.post<Frame>(`${networkApiUrl}/frames`, {}, options)
    .then((res) => res.data.id)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
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
  bucketId: BucketId,
  frameId: FrameId,
  filename: string,
  encryptionKey: Buffer,
  index: Buffer,
  shardMetas: ShardMeta[],
  options: AxiosRequestConfig
): Promise<BucketEntryId> {
  const hmac = generateHmac(encryptionKey, shardMetas);
  const newBucketEntry = generateBucketEntry(frameId, filename, index, hmac);

  console.log('BuckeTentry', JSON.stringify(newBucketEntry, null, 2));

  return axios.post<CreateEntryFromFrameResponse>(
    `${networkApiUrl}/buckets/${bucketId}/files`,
    newBucketEntry,
    options
  ).then((res) => {
    return res.data.id;
  }).catch((err) => {
    throw new Error(request.extractMessageFromError(err));
  });
}

function generateBucketEntry(
  frameId: FrameId,
  filename: string,
  index: Buffer,
  hmac: string
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

async function encryptFile(fileUri: string, fileSize: number, cipher: Cipher): Promise<FileEncryptedURI> {
  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / chunksOf);

  const fileEncryptedURI: FileEncryptedURI = getDocumentsDir() + 'hola.enc';
  const writer = await RNFetchBlob.fs.writeStream(fileEncryptedURI, 'base64');

  let start = 0;

  return eachLimit(new Array(chunks), 1, (_, cb) => {
    RFNS.read(fileUri, chunksOf, start, 'base64').then((res) => {
      cipher.write(Buffer.from(res, 'base64'));
      return writer.write(cipher.read().toString('base64'));
    }).then(() => {
      start += twoMb;
      cb(null);
    }).catch((err) => {
      cb(err);
    });
  }).then(() => {
    return writer.close();
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

  const filename = await EncryptFilename(
    credentials.encryptionKey,
    bucketId,
    uuid.v4().toString()
  );

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

  // console.log(JSON.stringify(shardMetas[0], null, 2));

  console.log('negotiating contract');

  // 5. Negotiate contract
  const contract = await negotiateContract(frameId, shardMetas[0], defaultRequestOptions);

  console.log('negotiated contract');
  // console.log(JSON.stringify(contract, null, 2));

  console.log('Size ' + (await RFNS.stat(fileEncryptedURI)).size);

  // 6. Upload file
  const files: UploadFileItem[] = [{
    filename: '',
    filepath: fileEncryptedURI,
    filetype: '',
    name: ''
  }];

  console.log('start put');
  await RNFetchBlob.fetch('PUT', contract.url, {}, RNFetchBlob.wrap(fileEncryptedURI));
  console.log('finish put');

  // async function getBlob(fileUri: string) {
  //   const resp = await fetch(fileUri);
  //   const imageBody = await resp.blob();
  //   return imageBody;
  // }

  // async function uploadImage(uploadUrl: string, fileUri: string) {
  //   const imageBody = await getBlob(fileUri);

  //   console.log('IMAGE SIZE ' + imageBody.size);

  //   return fetch(uploadUrl, {
  //     method: 'PUT',
  //     body: imageBody
  //   });
  // }

  // console.log('upload image starts');
  // await uploadImage(contract.url, fileEncryptedURI);
  // console.log('upload image ends');

  // const uploadResult = RFNS.uploadFiles({
  //   toUrl: contract.url,
  //   // binaryStreamOnly
  //   files,
  //   method: 'PUT',

  //   progress: (res) => {
  //     console.log('PROGRESS ' + ((res.totalBytesSent / res.totalBytesExpectedToSend) * 100).toFixed(2));
  //   }
  // });

  // await uploadResult.promise;

  // 7. Create file entry
  return createBucketEntry(
    bucketId,
    frameId,
    filename,
    fileEncryptionKey,
    index,
    shardMetas,
    defaultRequestOptions
  ).catch((err) => {
    throw new Error(request.extractMessageFromError(err));
  });
}
