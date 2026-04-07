import { pbkdf2 } from '@internxt/rn-crypto';
import { sha512 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

/**
 * SHA512 — mirrors drive-web getFileDeterministicKey.
 */
export const getFileDeterministicKey = (key: Buffer | string, data: Buffer | string): Buffer => {
  const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key as string);
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
  const hash = sha512.create();
  hash.update(new Uint8Array(keyBuf));
  hash.update(new Uint8Array(dataBuf));
  return Buffer.from(hash.digest());
};

export const generateFileBucketKey = async (mnemonic: string, bucketId: string): Promise<Buffer> => {
  const seed = await pbkdf2(mnemonic, 'mnemonic', 2048, 64);
  return getFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
};

export const generateFileKey = async (mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> => {
  const bucketKey = await generateFileBucketKey(mnemonic, bucketId);
  return getFileDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32);
};
