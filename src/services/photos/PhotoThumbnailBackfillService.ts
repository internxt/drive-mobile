import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { logger } from '@internxt-mobile/services/common';
import { isThumbnailSupported } from '@internxt-mobile/services/common/media/thumbnail.constants';
import { stripFileUri } from '@internxt-mobile/services/common/uri/uriHelpers';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { TimelinePhotoItem } from 'src/screens/PhotosScreen/types';
import { photosLocalDB } from './database/photosLocalDB';
import { UploadCredentials, uploadThumbnailForAsset } from './PhotoUploadService';
import { splitFileNameAndExtension } from './PhotoUploadService.utils';

const getThumbnailCacheDir = () => fileSystemService.getCacheDir() + '/photo_thumbnail_backfill/';
const thumbnailCachePathFor = (remoteFileId: string) => `${getThumbnailCacheDir()}${remoteFileId}.jpg`;

export interface BackfilledThumbnailRefs {
  thumbnailBucketId: string;
  thumbnailBucketFile: string;
  thumbnailType: string;
  thumbnailPath: string | null;
}

/**
 * Generates and uploads a thumbnail for a cloud-only asset that doesn't have one yet. Reuses an
 * already-downloaded local copy of the file instead of downloading it again. No-op for local
 * items or items that already have a thumbnail.
 *
 * @param params.item - Timeline item to backfill a thumbnail for.
 * @param params.localUri - Local URI of the already-downloaded full asset.
 * @returns The new thumbnail refs if one was generated, uploaded and persisted; `null` otherwise
 * (already had one, unsupported extension, or the upload failed).
 */
const backfillCloudThumbnail = async ({
  item,
  localUri,
}: {
  item: TimelinePhotoItem;
  localUri: string;
}): Promise<BackfilledThumbnailRefs | null> => {
  if (item.type !== 'cloud-only' || item.thumbnailBucketFile) {
    return null;
  }

  const { fileExtension } = splitFileNameAndExtension(item.fileName);
  if (!isThumbnailSupported(fileExtension)) {
    return null;
  }

  const asset = await photosLocalDB.getCloudAssetById(item.id);
  if (!asset?.bucket) {
    logger.warn(`[PhotoThumbnailBackfillService] No bucket for cloud asset ${item.id}, skipping backfill`);
    return null;
  }

  try {
    const user = await asyncStorageService.getUser();
    const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfigFromUser(user);
    const credentials: UploadCredentials = { bucketId: asset.bucket, bridgeUser, bridgePass, encryptionKey };

    const localFilePath = stripFileUri(localUri);
    const uploaded = await uploadThumbnailForAsset(localFilePath, fileExtension, item.id, credentials, true);
    if (!uploaded) {
      return null;
    }

    let cachedThumbnailUri: string | null = null;
    if (uploaded.localPath) {
      await fileSystemService.ensureDir(getThumbnailCacheDir());
      const destPath = thumbnailCachePathFor(item.id);
      await fileSystemService.moveFile(uploaded.localPath, destPath);
      cachedThumbnailUri = fileSystemService.pathToUri(destPath);
    }

    const refs: BackfilledThumbnailRefs = {
      thumbnailBucketId: uploaded.bucketId,
      thumbnailBucketFile: uploaded.bucketFile,
      thumbnailType: uploaded.type,
      thumbnailPath: cachedThumbnailUri,
    };

    await photosLocalDB.setCloudThumbnailRefs(item.id, {
      bucketId: refs.thumbnailBucketId,
      bucketFile: refs.thumbnailBucketFile,
      type: refs.thumbnailType,
      localPath: refs.thumbnailPath,
    });

    logger.info(`[PhotoThumbnailBackfillService] Backfilled thumbnail for cloud asset ${item.id}`);
    return refs;
  } catch (error) {
    logger.error(`[PhotoThumbnailBackfillService] Failed to backfill thumbnail for ${item.id}: ${error}`);
    return null;
  }
};

export const PhotoThumbnailBackfillService = { backfillCloudThumbnail };
