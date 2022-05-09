import RNFetchBlob from 'rn-fetch-blob';
import { stat, read } from 'react-native-fs';
import { createDecipheriv, Decipher } from 'react-native-crypto';

function getAes256CtrDecipher(key: Buffer, iv: Buffer): Decipher {
  return createDecipheriv('aes-256-ctr', key, iv);
}

/**
 * Decrypts a file from a given path, storing it on the provided path
 * @param fromPath Path where file encrypted is
 * @param toPath Path where file decrypted will be stored
 * @param fileDecryptionKey File decryption key
 * @param iv Initialization vector for decryption
 * @param options 
 * @returns 
 */
export async function decryptFileFromFs(
  fromPath: string,
  toPath: string,
  fileDecryptionKey: Buffer,
  iv: Buffer,
  options?: {
    progress: (progress: number) => void;
  },
): Promise<void> {
  const decipher = getAes256CtrDecipher(fileDecryptionKey.slice(0, 32), iv);
  const fileSize = parseInt((await stat(fromPath)).size);

  const twoMb = 2 * 1024 * 1024;
  const chunksOf = twoMb;
  const chunks = Math.ceil(fileSize / chunksOf);

  const URIWhereWriteFile = toPath;
  const writer = await RNFetchBlob.fs.writeStream(URIWhereWriteFile, 'base64');

  let start = 0;

  options?.progress(0);

  for (let i = 0; i < chunks; i++) {
    const b64Content = await read(fromPath, chunksOf, start, 'base64');
    decipher.write(Buffer.from(b64Content, 'base64'));
    await writer.write(decipher.read().toString('base64'));

    start += chunksOf;
    options?.progress(Math.min(start / fileSize, 1));
  }

  return writer.close();
}
