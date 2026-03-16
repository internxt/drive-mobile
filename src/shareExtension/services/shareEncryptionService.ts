import { encryptFile, encryptFileToChunks } from '@internxt/rn-crypto';
import { ALGORITHMS } from '@internxt/sdk/dist/network';
import { BinaryData } from '@internxt/sdk/dist/network/types';
import { ripemd160 as nobleRipemd160 } from '@noble/hashes/legacy.js';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { Buffer } from 'buffer';
import { generateFileKey } from '../../network/crypto';

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


export const buildSdkEncryptionAdapter = () => ({
  algorithm: ALGORITHMS.AES256CTR,
  validateMnemonic: (mnemonic: string) => validateMnemonic(mnemonic, wordlist),
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
