import { encryptFile, encryptFileToChunks, createHash as rnCreateHash, pbkdf2 as rnPbkdf2 } from '@internxt/rn-crypto';
import { HMAC } from '@internxt/rn-crypto/src/types/crypto';
import { ALGORITHMS } from '@internxt/sdk/dist/network';
import { BinaryData } from '@internxt/sdk/dist/network/types';
import { ripemd160 as nobleRipemd160 } from '@noble/hashes/legacy.js';
import { Buffer } from 'buffer';

/** Cryptographically secure random bytes via Hermes globalThis.crypto */
const generateSecureRandomBytes = (size: number): Buffer => {
  const randomBytesArray = new Uint8Array(size);
  (globalThis as unknown as { crypto: { getRandomValues(arr: Uint8Array): void } }).crypto.getRandomValues(
    randomBytesArray,
  );
  return Buffer.from(randomBytesArray);
};

/** RIPEMD160 via @noble/hashes/legacy (pure-JS) — share extension can't link arbitrary native modules */
export const computeRipemd160Digest = (input: Buffer | string): Buffer => {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return Buffer.from(nobleRipemd160(new Uint8Array(inputBuffer)));
};

const computeHmacSha512 = async (key: Buffer | string, data: Buffer | string): Promise<Buffer> => {
  const hmacHasher = rnCreateHash(HMAC.sha512);
  hmacHasher.update(key);
  hmacHasher.update(data);
  return hmacHasher.digest() as Promise<Buffer>;
};

/**
 * Derives encryption key from mnemonic + bucketId + index.
 * Mirrors GenerateFileKey in @inxt-js/lib/crypto/crypto.ts — reimplemented here because
 * that module imports react-native-crypto at the top level, which crashes in the share extension.
 */
const generateFileKey = async (mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> => {
  const mnemonicSeedBytes = await rnPbkdf2(mnemonic, 'mnemonic', 2048, 64);
  const bucketDerivedKey = await computeHmacSha512(mnemonicSeedBytes, Buffer.from(bucketId, 'hex'));
  const indexDerivedKey = await computeHmacSha512(bucketDerivedKey.slice(0, 32), index);
  return indexDerivedKey.slice(0, 32);
};

export const buildSdkEncryptionAdapter = () => ({
  algorithm: ALGORITHMS.AES256CTR,
  validateMnemonic: (mnemonic: string) => typeof mnemonic === 'string' && mnemonic.trim().split(/\s+/).length >= 12,
  generateFileKey: (mnemonic: string, bucketId: string, index: BinaryData | string) =>
    generateFileKey(mnemonic, bucketId, index as Buffer),
  randomBytes: generateSecureRandomBytes,
});

export const encryptFileForUpload = (
  plainFilePath: string,
  encryptedFilePath: string,
  key: Buffer,
  iv: Buffer,
): Promise<void> =>
  new Promise((resolve, reject) => {
    encryptFile(plainFilePath, encryptedFilePath, key.toString('hex'), iv.toString('hex'), (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

export const encryptFileIntoMultipartChunks = (
  plainFilePath: string,
  encryptedPaths: string[],
  key: Buffer,
  iv: Buffer,
  partSize: number,
): Promise<void> =>
  new Promise((resolve, reject) => {
    encryptFileToChunks(
      plainFilePath,
      encryptedPaths,
      key.toString('hex'),
      iv.toString('hex'),
      partSize,
      (err: Error | null) => (err ? reject(err) : resolve()),
    );
  });
