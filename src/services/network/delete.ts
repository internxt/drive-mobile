import { FileId } from '@internxt/sdk';

import { BucketId, NetworkCredentials } from '../sync/types';

export async function deleteFile(bucketId: BucketId, fileId: FileId, credentials: NetworkCredentials): Promise<void> {
  if (!bucketId) {
    throw new Error('Upload error code 1');
  }

  if (!credentials.encryptionKey) {
    throw new Error('Upload error code 2');
  }

  if (!credentials.user) {
    throw new Error('Upload error code 3');
  }

  if (!credentials.pass) {
    throw new Error('Upload error code 4');
  }
}
