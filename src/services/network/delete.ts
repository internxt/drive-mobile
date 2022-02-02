import { FileId } from '@internxt/sdk/dist/photos';
import { NetworkCredentials } from '../../types';

export async function deleteFile(bucketId: string, fileId: FileId, credentials: NetworkCredentials): Promise<void> {
  if (!bucketId) {
    throw new Error('Upload error code 1');
  }

  if (!credentials.encryptionKey) {
    throw new Error('Upload error code 2');
  }

  if (!credentials.user) {
    throw new Error('Upload error code 3');
  }

  if (!credentials.password) {
    throw new Error('Upload error code 4');
  }
}
