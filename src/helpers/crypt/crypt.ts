import CryptoJS from 'crypto-js';
import { argon2id, createSHA1, pbkdf2 } from 'hash-wasm';
// import crypto from 'react-native-crypto';
import * as crypto from 'crypto';
import { constants } from '../../services/AppService';
import errorService from '../../services/ErrorService';
import AesUtils from '../aesUtils';

const password = constants.CRYPTO_SECRET || ''; // Force env var loading

/**
 * Argon2id parameters taken from RFC9106 (variant for memory-constrained environments)
 *  * @constant
 * @type {number}
 * @default
 */
const ARGON2ID_PARALLELISM = 4;
const ARGON2ID_ITERATIONS = 3;
const ARGON2ID_MEMORY = 65536;
const ARGON2ID_TAG_LEN = 32;
const ARGON2ID_SALT_LEN = 16;

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_TAG_LEN = 32;

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

// AES Plain text encryption method
export function encryptText(textToEncrypt: string): string {
  return encryptTextWithKey(textToEncrypt, password);
}

// AES Plain text decryption method
export function decryptText(encryptedText: string): string {
  return decryptTextWithKey(encryptedText, password);
}

// AES Plain text encryption method with enc. key
export function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);

    return text64.toString(CryptoJS.enc.Hex);
  } catch (err) {
    throw errorService.castError(err);
  }
}

// AES Plain text decryption method with enc. key
export function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    throw errorService.castError(err);
  }
}

export function isValidFilename(filename: string) {
  const EXCLUDED = ['..'];
  if (EXCLUDED.includes(filename)) {
    return false;
  }
  // eslint-disable-next-line no-control-regex
  return !/[<>:"/\\|?*\u0000-\u001F]/g.test(filename);
}
export function encryptFilename(filename: string, folderId: string): string {
  const { CRYPTO_SECRET2: CRYPTO_KEY } = constants;

  if (!isValidFilename(filename)) {
    throw new Error('This filename is not valid');
  }

  if (!CRYPTO_KEY) {
    throw new Error('Cannot encrypt filename due to missing encryption key');
  }

  return AesUtils.encrypt(filename, `${CRYPTO_KEY}-${folderId}`);
}

/**
 * Computes PBKDF2 and outputs the result in HEX format
 * @param {string} password - The password
 * @param {number} salt - The salt
 * @param {number}[iterations=PBKDF2_ITERATIONS] - The number of iterations to perform
 * @param {number} [hashLength=PBKDF2_TAG_LEN] - The desired output length
 * @returns {Promise<string>} The result of PBKDF2 in HEX format
 */
export function getPBKDF2(
  password: string,
  salt: string | Uint8Array,
  iterations = PBKDF2_ITERATIONS,
  hashLength = PBKDF2_TAG_LEN,
): Promise<string> {
  return pbkdf2({
    password,
    salt,
    iterations,
    hashLength,
    hashFunction: createSHA1(),
    outputType: 'hex',
  });
}

/**
 * Computes Argon2 and outputs the result in HEX format
 * @param {string} password - The password
 * @param {number} salt - The salt
 * @param {number} [parallelism=ARGON2ID_PARALLELISM] - The parallelism degree
 * @param {number}[iterations=ARGON2ID_ITERATIONS] - The number of iterations to perform
 * @param {number}[memorySize=ARGON2ID_MEMORY] - The number of KB of memeory to use
 * @param {number} [hashLength=ARGON2ID_TAG_LEN] - The desired output length
 * @param {'hex'|'binary'|'encoded'} [outputType="encoded"] - The output type
 * @returns {Promise<string>} The result of Argon2
 */
export function getArgon2(
  password: string,
  salt: string,
  outputType: 'hex' | 'binary' | 'encoded' = 'encoded',
  parallelism: number = ARGON2ID_PARALLELISM,
  iterations: number = ARGON2ID_ITERATIONS,
  memorySize: number = ARGON2ID_MEMORY,
  hashLength: number = ARGON2ID_TAG_LEN,
): Promise<string> {
  return argon2id({
    password,
    salt,
    parallelism,
    iterations,
    memorySize,
    hashLength,
    outputType,
  });
}

/**
 * Converts HEX string to Uint8Array the same way CryptoJS did it (for compatibility)
 * @param {string} hex - The input string in HEX
 * @returns {Uint8Array} The resulting Uint8Array identical to what CryptoJS previously did
 */
export function hex2oldEncoding(hex: string): Uint8Array {
  const words: number[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    words.push(parseInt(hex.slice(i, i + 8), 16) | 0);
  }
  const sigBytes = hex.length / 2;
  const uint8Array = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i++) {
    uint8Array[i] = (words[i >>> 2] >>> ((3 - (i % 4)) * 8)) & 0xff;
  }

  return uint8Array;
}

/**
 * Password hash computation. If no salt or salt starts with 'argon2id$'  - uses Argon2, else - PBKDF2
 * @param {PassObjectInterface} passObject - The input object containing password and salt (optional)
 * @returns {Promise<{salt: string; hash: string }>} The resulting hash and salt
 */
export async function passToHash(passObject: PassObjectInterface): Promise<{ salt: string; hash: string }> {
  let salt;
  let hash;

  if (!passObject.salt) {
    const argonSalt = crypto.randomBytes(ARGON2ID_SALT_LEN).toString('hex');
    hash = await getArgon2(passObject.password, argonSalt, 'hex');
    salt = 'argon2id$' + argonSalt;
  } else if (passObject.salt.startsWith('argon2id$')) {
    const argonSalt = passObject.salt.replace('argon2id$', '');
    hash = await getArgon2(passObject.password, argonSalt, 'hex');
    salt = passObject.salt;
  } else {
    salt = passObject.salt;
    const encoded = hex2oldEncoding(salt);
    hash = await getPBKDF2(passObject.password, encoded);
  }
  return { salt, hash };
}
