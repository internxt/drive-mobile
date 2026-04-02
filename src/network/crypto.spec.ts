import crypto from 'node:crypto';
import { createSHA512 } from 'hash-wasm';
import { generateFileBucketKey, generateFileKey, getFileDeterministicKey } from './crypto';

type Bytes = { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
const asUint8 = (v: Bytes): Uint8Array => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);

const reference = {
  getFileDeterministicKey(key: Bytes, data: Bytes): Buffer {
    return crypto.createHash('sha512').update(asUint8(key)).update(asUint8(data)).digest();
  },

  async generateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
    const seed = crypto.pbkdf2Sync(mnemonic, 'mnemonic', 2048, 64, 'sha512');
    return reference.getFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
  },

  async generateFileKey(mnemonic: string, bucketId: string, index: Bytes): Promise<Buffer> {
    const bucketKey = await reference.generateFileBucketKey(mnemonic, bucketId);
    return reference.getFileDeterministicKey(bucketKey.subarray(0, 32), index).subarray(0, 32);
  },
};

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const BUCKET_ID = 'a1b2c3d4e5f6a1b2c1d2e3f4a5b6c7d8';
const INDEX = Buffer.from([0, 0, 0, 1]);

describe('getFileDeterministicKey', () => {
  describe('output shape', () => {
    it('when called with buffer inputs, then returns a 64-byte Buffer', () => {
      const result = getFileDeterministicKey(Buffer.from('key'), Buffer.from('data'));
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(64);
    });

    it('when called with string inputs, then returns a 64-byte Buffer', () => {
      const result = getFileDeterministicKey('key', 'data');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(64);
    });
  });

  describe('compatibility', () => {
    it('when compared to Node.js SHA512, then produces identical output', () => {
      const key = Buffer.from('test_key_bytes');
      const data = Buffer.from('test_data_bytes');
      const result = getFileDeterministicKey(key, data);
      const expected = reference.getFileDeterministicKey(key, data);
      expect(result.toString('hex')).toBe(expected.toString('hex'));
    });

    it('when compared to hash-wasm SHA512 (drive-web), then produces identical output', async () => {
      const key = Buffer.from('test_key_bytes');
      const data = Buffer.from('test_data_bytes');
      const result = getFileDeterministicKey(key, data);
      const hash = await createSHA512();
      const expected = hash.init().update(key).update(data).digest();
      expect(result.toString('hex')).toBe(expected);
    });
  });
});

describe('generateFileBucketKey', () => {
  describe('output shape', () => {
    it('when called with a valid mnemonic and bucketId, then returns a 64-byte Buffer', async () => {
      const result = await generateFileBucketKey(MNEMONIC, BUCKET_ID);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(64);
    });
  });

  describe('compatibility', () => {
    it('when compared to Node.js PBKDF2 + SHA512 reference, then produces identical output', async () => {
      const result = await generateFileBucketKey(MNEMONIC, BUCKET_ID);
      const expected = await reference.generateFileBucketKey(MNEMONIC, BUCKET_ID);
      expect(result.toString('hex')).toBe(expected.toString('hex'));
    });
  });
});

describe('generateFileKey', () => {
  describe('output shape', () => {
    it('when called with valid inputs, then returns a 32-byte Buffer', async () => {
      const result = await generateFileKey(MNEMONIC, BUCKET_ID, INDEX);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(32);
    });
  });

  describe('compatibility', () => {
    it('when compared to Node.js reference, then produces identical output for Buffer index', async () => {
      const result = await generateFileKey(MNEMONIC, BUCKET_ID, INDEX);
      const expected = await reference.generateFileKey(MNEMONIC, BUCKET_ID, INDEX);
      expect(result.toString('hex')).toBe(expected.toString('hex'));
    });

    it('when compared to Node.js reference, then produces identical output for string index', async () => {
      const index = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = await generateFileKey(MNEMONIC, BUCKET_ID, index);
      const expected = await reference.generateFileKey(MNEMONIC, BUCKET_ID, Buffer.from(index));
      expect(result.toString('hex')).toBe(expected.toString('hex'));
    });
  });
});
