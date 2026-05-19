import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { logger } from '@internxt-mobile/services/common';
import { photosLocalDB } from './database/photosLocalDB';
import { PhotoItem, CloudPhotoItem } from 'src/screens/PhotosScreen/types';

const cacheDir = () => fileSystemService.getCacheDir() + '/photo_preview/';

const cachePathFor = (remoteFileId: string, ext: string) => `${cacheDir()}${remoteFileId}.${ext}`;

const extFromFileName = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts[parts.length - 1]?.toLowerCase() ?? 'jpg') : 'jpg';
};

const resolveLocalUri = async (item: PhotoItem): Promise<string | null> => {
  try {
    const info = await photoMediaLibraryService.getAssetInfo(item.id);
    return info.localUri ?? item.uri ?? null;
  } catch (error) {
    logger.error(`[PhotoFullImageService] Failed to resolve local URI for ${item.id}: ${error}`);
    return item.uri ?? null;
  }
};

const downloadCloudFullImage = async (item: CloudPhotoItem, signal: AbortSignal): Promise<string | null> => {
  const ext = extFromFileName(item.fileName);
  const cachePath = cachePathFor(item.id, ext);

  const alreadyCached = await fileSystemService.exists(cachePath);
  if (alreadyCached) return cachePath;

  const asset = await photosLocalDB.getCloudAssetById(item.id);
  if (!asset?.fileId) {
    logger.warn(`[PhotoFullImageService] No fileId for cloud asset ${item.id}, skipping full-res download`);
    return null;
  }

  const user = await asyncStorageService.getUser();

  await fileSystemService.ensureDir(cacheDir());

  try {
    await driveFileService.downloadFile(
      user,
      user.bucket,
      asset.fileId,
      {
        downloadPath: cachePath,
        downloadProgressCallback: () => undefined,
        decryptionProgressCallback: () => undefined,
        signal,
      },
      asset.fileSize ?? 0,
    );

    if (signal.aborted) {
      await fileSystemService.unlinkIfExists(cachePath);
      return null;
    }

    return cachePath;
  } catch (error) {
    if (!signal.aborted) {
      logger.error(`[PhotoFullImageService] Download failed for ${item.id}: ${error}`);
    }
    await fileSystemService.unlinkIfExists(cachePath);
    return null;
  }
};

export const PhotoFullImageService = {
  getFullImageUri: async (
    item: PhotoItem | CloudPhotoItem,
    signal: AbortSignal,
  ): Promise<string | null> => {
    if (item.type === 'local') {
      return resolveLocalUri(item);
    }
    return downloadCloudFullImage(item, signal);
  },
};
