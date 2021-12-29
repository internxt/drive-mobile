import CryptoJS from 'crypto-js';
import crypto from 'react-native-crypto';
import errorService from '../services/error';
import AesUtils from './aesUtils';
import { REACT_NATIVE_CRYPTO_SECRET } from '@env';

const password = (process && process.env && REACT_NATIVE_CRYPTO_SECRET) || ''; // Force env var loading

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

export function probabilisticEncryption(content: string): string | null {
  try {
    const b64 = crypto.createCipher('aes-256-gcm', REACT_NATIVE_CRYPTO_SECRET);

    b64.write(content);
    // const b64 = CryptoJS.AES.encrypt(content, App.config.get('secrets').CRYPTO_SECRET).toString();

    const e64 = Buffer.concat([b64.update(content), b64.final()]).toString('base64');
    // const e64 = CryptoJS.enc.Base64.parse(b64);

    const eHex = Buffer.from(e64, 'base64').toString('hex');
    // const eHex = e64.toString(CryptoJS.enc.Hex);

    return eHex;
  } catch (error) {
    return null;
  }
}

export function probabilisticDecryption(cipherText: string): string | null {
  try {
    const reb64 = Buffer.from(cipherText).toString('hex');
    // const reb64 = CryptoJS.enc.Hex.parse(cipherText);

    const bytes = Buffer.from(reb64).toString('base64');
    // const bytes = reb64.toString(CryptoJS.enc.Base64);

    const decrypt = crypto.createDecipher('aes-256-gcm', REACT_NATIVE_CRYPTO_SECRET);
    // const decrypt = CryptoJS.AES.decrypt(bytes, App.config.get('secrets').CRYPTO_SECRET);

    const plain = Buffer.concat([decrypt.update(cipherText), decrypt.final()]).toString('utf8');
    // const plain = decrypt.toString(CryptoJS.enc.Utf8);

    return plain;
  } catch (error) {
    return null;
  }
}

export function encryptFilename(filename: string, folderId: string): string {
  const { REACT_NATIVE_CRYPTO_SECRET2: CRYPTO_KEY } = process.env;

  if (!CRYPTO_KEY) {
    throw new Error('Cannot encrypt filename due to missing encryption key');
  }

  return AesUtils.encrypt(filename, `${CRYPTO_KEY}-${folderId}`);
}

export function deterministicEncryption(content: string, salt?: string | number): string | null {
  try {
    const key = Buffer.from(REACT_NATIVE_CRYPTO_SECRET as string).toString('hex');
    // const key = CryptoJS.enc.Hex.parse(App.config.get('secrets').CRYPTO_SECRET);

    const iv = salt ? Buffer.from(salt.toString()).toString('hex') : key;
    // const iv = salt ? CryptoJS.enc.Hex.parse(salt.toString()) : key;

    const encrypt = crypto.createCipheriv('aes-256-gcm', key, iv);
    // const encrypt = CryptoJS.AES.encrypt(content, key, { iv }).toString();

    const b64 = Buffer.concat([encrypt.update(content), encrypt.final()]).toString('base64');
    // const b64 = CryptoJS.enc.Base64.parse(encrypt);

    const eHex = Buffer.from(b64).toString('hex');
    // const eHex = b64.toString(CryptoJS.enc.Hex);

    return eHex;
  } catch (e) {
    return null;
  }
}

export function deterministicDecryption(cipherText: string, salt?: string | number): string | null {
  try {
    const key = Buffer.from(REACT_NATIVE_CRYPTO_SECRET as string).toString('hex');
    // const key = CryptoJS.enc.Hex.parse(App.config.get('secrets').CRYPTO_SECRET);

    const iv = salt ? Buffer.from(salt.toString()).toString('hex') : key;
    // const iv = salt ? CryptoJS.enc.Hex.parse(salt.toString()) : key;

    const reb64 = Buffer.from(cipherText).toString('hex');
    // const reb64 = CryptoJS.enc.Hex.parse(cipherText);

    const bytes = Buffer.from(reb64).toString('base64');
    // const bytes = reb64.toString(CryptoJS.enc.Base64);

    const decrypt = crypto.createDecipheriv('aes-256-gcm', key, iv);
    // const decrypt = CryptoJS.AES.decrypt(bytes, key, { iv });

    const plain = Buffer.concat([decrypt.update(Buffer.from(bytes)), decrypt.final()]).toString('utf8');
    // const plain = decrypt.toString(CryptoJS.enc.Utf8);

    return plain;
  } catch (e) {
    return null;
  }
}
