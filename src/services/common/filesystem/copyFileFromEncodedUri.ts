import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { decodeUriSafely } from '../uri/uriHelpers';

export async function copyFileFromEncodedUri(sourceUri: string, destPath: string): Promise<void> {
  await fileSystemService.copyFile(decodeUriSafely(sourceUri), destPath);
}
