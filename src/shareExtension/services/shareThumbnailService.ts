import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { Buffer } from 'buffer';
import uuid from 'react-native-uuid';
import { isThumbnailSupported } from '../../services/common/media/thumbnail.constants';
import { generateThumbnail } from '../../services/common/media/thumbnail.generation';
import type { GeneratedThumbnail } from '../../services/common/media/thumbnail.types';
import { computeRipemd160Digest, encryptFileForUpload } from './shareEncryptionService';
import ShareSdkManager from './ShareSdkManager';
import { getTmpPath, ShareUploadSession, uploadEncryptedFile } from './shareUploadService';

const uploadAndRegisterThumbnail = async (
  thumbnail: GeneratedThumbnail,
  fileUuid: string,
  bucket: string,
  mnemonic: string,
  session: ShareUploadSession,
): Promise<void> => {
  const { network, cryptoLib } = session;
  const encryptedPath = getTmpPath(`${uuid.v4()}_thumb.enc`);
  let encryptedHash: string | undefined;

  try {
    const thumbnailFileId = await uploadFile(
      network,
      cryptoLib,
      bucket,
      mnemonic,
      thumbnail.size,
      async (_algorithm, key, iv) => {
        await encryptFileForUpload(thumbnail.path, encryptedPath, key as Buffer, iv as Buffer);
        const sha256Hex = await RNFS.hash(encryptedPath, 'sha256');
        encryptedHash = computeRipemd160Digest(Buffer.from(sha256Hex, 'hex')).toString('hex');
      },
      async (url: string) => {
        if (!encryptedHash) throw new Error('invariant: encryptedHash not assigned');
        await uploadEncryptedFile(url, encryptedPath);
        return encryptedHash;
      },
    );

    await ShareSdkManager.storageV2.createThumbnailEntryWithUUID({
      fileUuid,
      type: thumbnail.type,
      size: thumbnail.size,
      maxWidth: thumbnail.width,
      maxHeight: thumbnail.height,
      bucketId: bucket,
      bucketFile: thumbnailFileId,
      encryptVersion: EncryptionVersion.Aes03,
    });
  } finally {
    await RNFS.unlink(encryptedPath).catch(() => undefined);
  }
};

export const generateAndUploadThumbnail = async (
  sourceFilePath: string,
  fileExtension: string,
  fileUuid: string,
  bucket: string,
  mnemonic: string,
  session: ShareUploadSession,
): Promise<string | null> => {
  if (!isThumbnailSupported(fileExtension)) return null;

  let thumbnail: GeneratedThumbnail;
  try {
    thumbnail = await generateThumbnail(sourceFilePath, fileExtension);
  } catch {
    return null;
  }

  try {
    await uploadAndRegisterThumbnail(thumbnail, fileUuid, bucket, mnemonic, session);
  } catch (error) {
    console.error('Failed to upload thumbnail, proceeding without it, error:', error);
  }

  return thumbnail.path;
};
