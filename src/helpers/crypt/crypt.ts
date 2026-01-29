import CryptoJS from 'crypto-js';
import { constants } from '../../services/AppService';
import errorService from '../../services/ErrorService';
import AesUtils from '../aesUtils';

const password = constants.CRYPTO_SECRET || ''; // Force env var loading

interface PassObjectInterface {
  password: string;
  salt?: string;
}

export function passToHash(passObject: PassObjectInterface): { salt: string; hash: string } {
  const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
  const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
  const hashedObjetc = {
    salt: salt.toString(),
    hash: hash.toString(),
  };

  return hashedObjetc;
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


/**
 * Validates if a filename is safe for cross-platform use.
 * Only blocks strictly dangerous characters that would cause issues on any OS.
 *
 * Blocked:
 * - Path separators: / \
 * - Windows problematic: < > : " | ? *
 * - Control characters: \x00-\x1F
 * - Special navigation: . and ..
 * - Empty or too long filenames
 */
export function isValidFilename(filename: string) {
  const isEmpty = !filename || filename.trim().length === 0;
  const isNavigationPath = filename === '.' || filename === '..';
  const isTooLong = filename?.length > 255;

  // eslint-disable-next-line no-control-regex
  const DANGEROUS_CHARS_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g;
  const hasDangerousChars = filename && DANGEROUS_CHARS_PATTERN.test(filename);

  if (isEmpty || isNavigationPath || isTooLong || hasDangerousChars) {
    return false;
  }

  return true;
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

