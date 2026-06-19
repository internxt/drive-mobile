import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { logger } from '@internxt-mobile/services/common';
import { toFileUri } from '@internxt-mobile/services/common/uri/uriHelpers';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { copyAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CloudPhotoItem, PhotoItem } from 'src/screens/PhotosScreen/types';
import { photosLocalDB } from './database/photosLocalDB';
import { LIVE_PHOTO_VIDEO_TYPE } from './livePhoto.constants';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';
import { splitFileNameAndExtension } from './PhotoUploadService.utils';

const getCacheDir = () => fileSystemService.getCacheDir() + '/photo_preview/';
const getShareTempDir = () => fileSystemService.getCacheDir() + '/photo_share/';
const assetIdToFileName = (id: string, ext: string) => `${id.replace(/\//g, '_')}.${ext}`;

const cachePathFor = (remoteFileId: string, ext: string) => `${getCacheDir()}${remoteFileId}.${ext}`;

const extFromFileName = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts[parts.length - 1]?.toLowerCase() ?? 'jpg') : 'jpg';
};

const resolveLocalUri = async (item: PhotoItem): Promise<string | null> => {
  try {
    const info = await photoMediaLibraryService.getAssetInfo(item.id);
    return info.localUri ?? item.uri ?? null;
  } catch (error) {
    logger.error(`[PhotoAssetFetchService] Failed to resolve local URI for ${item.id}: ${error}`);
    return item.uri ?? null;
  }
};

const downloadCloudAsset = async (item: CloudPhotoItem, signal: AbortSignal): Promise<string | null> => {
  const ext = extFromFileName(item.fileName);
  const cachePath = cachePathFor(item.id, ext);

  const alreadyCached = await fileSystemService.exists(cachePath);
  if (alreadyCached) return fileSystemService.pathToUri(cachePath);

  const asset = await photosLocalDB.getCloudAssetById(item.id);
  if (!asset?.fileId) {
    logger.warn(`[PhotoAssetFetchService] No fileId for cloud asset ${item.id}, skipping download`);
    return null;
  }
  if (!asset.bucket) {
    logger.warn(`[PhotoAssetFetchService] No bucket for cloud asset ${item.id}, skipping download`);
    return null;
  }

  const user = await asyncStorageService.getUser();

  await fileSystemService.ensureDir(getCacheDir());

  try {
    await driveFileService.downloadFile(
      user,
      asset.bucket,
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

    return fileSystemService.pathToUri(cachePath);
  } catch (error) {
    if (!signal.aborted) {
      logger.error(`[PhotoAssetFetchService] Download failed for ${item.id}: ${error}`);
    }
    await fileSystemService.unlinkIfExists(cachePath);
    return null;
  }
};

const copyPhAssetToSandbox = async (item: PhotoItem): Promise<string> => {
  const info = await photoMediaLibraryService.getAssetInfo(item.id);
  const { fileExtension: ext } = splitFileNameAndExtension(info.filename);

  const cacheDir = getShareTempDir();
  await fileSystemService.ensureDir(cacheDir);
  const destPath = `${cacheDir}${assetIdToFileName(item.id, ext)}`;
  if (!item.uri) {
    throw new Error(`copyPhAssetToSandbox: asset ${item.id} has no URI`);
  }

  await copyAsync({ from: item.uri, to: toFileUri(destPath) });
  return destPath;
};

const downloadPairedVideo = async (pairedVideoRemoteFileId: string, signal: AbortSignal): Promise<string | null> => {
  const asset = await photosLocalDB.getCloudAssetById(pairedVideoRemoteFileId);
  if (!asset?.fileId || !asset.bucket) {
    logger.warn(`[PhotoAssetFetchService] No fileId/bucket for paired video ${pairedVideoRemoteFileId}`);
    return null;
  }
  const cachePath = cachePathFor(pairedVideoRemoteFileId, asset.extension ?? LIVE_PHOTO_VIDEO_TYPE);
  const alreadyCached = await fileSystemService.exists(cachePath);
  if (alreadyCached) {
    return cachePath;
  }

  const user = await asyncStorageService.getUser();
  await fileSystemService.ensureDir(getCacheDir());

  try {
    await driveFileService.downloadFile(
      user,
      asset.bucket,
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
      logger.error(`[PhotoAssetFetchService] Paired video download failed for ${pairedVideoRemoteFileId}: ${error}`);
    }
    await fileSystemService.unlinkIfExists(cachePath);
    return null;
  }
};

export type ExportUri = { uri: string; cleanup?: () => void };

export const PhotoAssetFetchService = {
  fetchUri: async (item: PhotoItem | CloudPhotoItem, signal: AbortSignal): Promise<string | null> => {
    if (item.type === 'local') {
      return resolveLocalUri(item);
    }
    return downloadCloudAsset(item, signal);
  },

  /**
   * Returns the URI to use for **playback** (react-native-video / image viewer).
   * On iOS, local videos must use the canonical `ph://` URI so AVFoundation can load the
   * asset via PHCachingImageManager.requestAVAsset. Direct `file:///var/mobile/…` paths into
   * the Photos library fail with NSCocoaErrorDomain 257 (no permission). For every other
   * combination (photos, Android, cloud) this delegates to `fetchUri` as usual.
   */
  fetchPlaybackUri: async (item: PhotoItem | CloudPhotoItem, signal: AbortSignal): Promise<string | null> => {
    if (Platform.OS === 'ios' && item.type === 'local' && item.mediaType === 'video') {
      return item.uri ?? null;
    }
    return PhotoAssetFetchService.fetchUri(item, signal);
  },

  fetchLivePhotoComponents: async (
    item: CloudPhotoItem,
    signal: AbortSignal,
  ): Promise<{ photoPath: string; videoPath: string } | null> => {
    if (!item.pairedVideoRemoteFileId) {
      logger.warn('[PhotoAssetFetchService] fetchLivePhotoComponents called on item without pairedVideoRemoteFileId');
      return null;
    }

    const [photoUri, videoPath] = await Promise.all([
      downloadCloudAsset(item, signal),
      downloadPairedVideo(item.pairedVideoRemoteFileId, signal),
    ]);

    if (!photoUri || !videoPath || signal.aborted) {
      return null;
    }

    // downloadCloudAsset returns a file:// URI; strip it for the native module (saveLivePhotoToLibrary function)
    const photoPath = photoUri.startsWith('file://') ? photoUri.slice('file://'.length) : photoUri;
    return { photoPath, videoPath };
  },

  resolveExportUri: async (item: PhotoItem | CloudPhotoItem, signal: AbortSignal): Promise<ExportUri | null> => {
    if (item.type === 'local' && Platform.OS === 'ios') {
      const sandboxPath = await copyPhAssetToSandbox(item);
      return {
        uri: sandboxPath,
        cleanup: () => fileSystemService.unlinkIfExists(sandboxPath).catch(() => undefined),
      };
    }

    const uri = await PhotoAssetFetchService.fetchUri(item, signal);
    return uri ? { uri } : null;
  },
};
