import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { decodeFileUriSafely } from '../uri/uriHelpers';

export const copyFileFromEncodedUri = async (sourceUri: string, destPath: string): Promise<void> => {
  await fileSystemService.copyFile(decodeFileUriSafely(sourceUri), destPath);
};
