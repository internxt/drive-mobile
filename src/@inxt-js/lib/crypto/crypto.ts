/**
 * Internxt Cryptographic Functions
 *
 * These functions are used by BOTH legacy and modern download systems.
 * They implement Internxt-specific key derivation and hashing algorithms.
 *
 * Usage:
 * - sha256: Used for file hashing
 * - ripemd160: Used for file integrity verification (SHA256 + RIPEMD160)
 * - GenerateFileKey: Derives encryption key from mnemonic + bucketId + index
 *
 * Used by:
 * - NetworkFacade (modern)
 * - NetworkService/download (v1)
 * - @inxt-js/FileObject (legacy fallback)
 */

import * as crypto from 'react-native-crypto';

import { createHash, pbkdf2 } from '@internxt/rn-crypto';
import { HMAC } from '@internxt/rn-crypto/src/types/crypto';
import unorm from 'unorm';

export function sha256(input: Buffer): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

export function ripemd160(input: Buffer | string): Buffer {
  return crypto.createHash('ripemd160').update(input).digest();
}

export async function GetDeterministicKey(key: Buffer | string, data: Buffer | string): Promise<Buffer> {
  const hash = createHash(HMAC.sha512);
  hash.update(key);
  hash.update(data);

  return hash.digest();
}

function salt(password: string) {
  return 'mnemonic' + (unorm.nfkd(password) || '');
}
async function mnemonicToSeed(mnemonic: string, password = '') {
  return pbkdf2(mnemonic, salt(password), 2048, 64);
}

export async function GenerateBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic);
  return GetDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
}

export async function GenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
  const bucketKey = await GenerateBucketKey(mnemonic, bucketId);
  const deterministicKey = await GetDeterministicKey(bucketKey.slice(0, 32), index);
  return deterministicKey.slice(0, 32);
}
