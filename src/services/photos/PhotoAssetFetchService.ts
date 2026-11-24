import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { logger } from '@internxt-mobile/services/common';
import { toFileUri } from '@internxt-mobile/services/common/uri/uriHelpers';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import storageService from '@internxt-mobile/services/StorageService';
import { copyAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CloudPhotoItem, PhotoItem } from 'src/screens/PhotosScreen/types';
import { CloudAssetEntry, photosLocalDB } from './database/photosLocalDB';
import { LIVE_PHOTO_VIDEO_TYPE } from './livePhoto.constants';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';
import { splitFileNameAndExtension } from './PhotoUploadService.utils';

const getCacheDir = () => fileSystemService.getCacheDir() + '/photo_preview/';
const getShareTempDir = () => fileSystemService.getCacheDir() + '/photo_share/';
const assetIdToFileName = (id: string, ext: string) => `${id.replace(/\//g, '_')}.${ext}`;

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

/** Returns a local copy of a cloud photo or video with the content saved in `cloud_asset`, as a `file://` URI. */
const downloadCloudAsset = async (item: CloudPhotoItem, signal: AbortSignal): Promise<string | null> => {
  const asset = await photosLocalDB.getCloudAssetById(item.id);
  const savedContent = getSavedContent(asset);
  if (!savedContent) {
    logger.warn(`[PhotoAssetFetchService] No fileId/bucket for cloud asset ${item.id}, skipping download`);
    return null;
  }
  const cachedCopyPath = await getCopyOfContent(item.id, savedContent, extFromFileName(item.fileName), signal);
  return cachedCopyPath ? fileSystemService.pathToUri(cachedCopyPath) : null;
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

interface RemoteContent {
  fileId: string;
  bucket: string;
  size: number;
}

/** Name of the cached copy of a remote file holding the content with the given bucket file id. */
const cachedCopyFileName = (remoteFileId: string, contentFileId: string, extension: string) =>
  `${remoteFileId}.${contentFileId}.${extension}`;

/** Every cached copy of a remote file, whatever content it holds and whatever its name format. */
const findCachedCopies = async (remoteFileId: string): Promise<{ name: string; path: string }[]> => {
  const cacheDir = getCacheDir();
  if (!(await fileSystemService.exists(cacheDir))) {
    return [];
  }
  const entries = await fileSystemService.readDir(cacheDir);
  return entries.filter((entry) => entry.name.startsWith(`${remoteFileId}.`));
};

/** Content saved in `cloud_asset` for a remote file, or null when the row lacks the file id or the bucket. */
const getSavedContent = (asset: CloudAssetEntry | null): RemoteContent | null => {
  if (!asset?.fileId || !asset.bucket) {
    return null;
  }
  return { fileId: asset.fileId, bucket: asset.bucket, size: asset.fileSize ?? 0 };
};

/** Content of a remote file as Drive has it now, or null when Drive can't be asked. */
const fetchCurrentContent = async (remoteFileId: string): Promise<RemoteContent | null> => {
  try {
    const fileMeta = await storageService.getFileMetadata(remoteFileId);
    if (!fileMeta.fileId) {
      return null;
    }
    return { fileId: fileMeta.fileId, bucket: fileMeta.bucket, size: Number(fileMeta.size) };
  } catch (error) {
    logger.warn(`[PhotoAssetFetchService] Could not get the metadata of ${remoteFileId}: ${error}`);
    return null;
  }
};

const downloadContent = async (
  remoteFileId: string,
  content: RemoteContent,
  extension: string,
  signal: AbortSignal,
): Promise<string | null> => {
  const cachePath = `${getCacheDir()}${cachedCopyFileName(remoteFileId, content.fileId, extension)}`;
  const user = await asyncStorageService.getUser();
  await fileSystemService.ensureDir(getCacheDir());

  try {
    await driveFileService.downloadFile(
      user,
      content.bucket,
      content.fileId,
      {
        downloadPath: cachePath,
        downloadProgressCallback: () => undefined,
        decryptionProgressCallback: () => undefined,
        signal,
      },
      content.size,
    );

    if (signal.aborted) {
      await fileSystemService.unlinkIfExists(cachePath);
      return null;
    }

    return cachePath;
  } catch (error) {
    if (!signal.aborted) {
      logger.error(`[PhotoAssetFetchService] Download failed for ${remoteFileId}: ${error}`);
    }
    await fileSystemService.unlinkIfExists(cachePath);
    return null;
  }
};

/**
 * Returns the cached copy of a remote file holding `content`. When it is missing, deletes the copies holding other
 * contents and downloads it.
 */
const getCopyOfContent = async (
  remoteFileId: string,
  content: RemoteContent,
  extension: string,
  signal: AbortSignal,
): Promise<string | null> => {
  const cachePath = `${getCacheDir()}${cachedCopyFileName(remoteFileId, content.fileId, extension)}`;
  if (await fileSystemService.exists(cachePath)) {
    return cachePath;
  }
  const outdatedCopies = await findCachedCopies(remoteFileId);
  for (const outdatedCopy of outdatedCopies) {
    await fileSystemService.unlinkIfExists(outdatedCopy.path);
  }
  return downloadContent(remoteFileId, content, extension, signal);
};

/**
 * Returns a local copy of a remote file with the content Drive has now, and saves that content in `cloud_asset` when
 * it changed. Without an answer from Drive, it returns any cached copy, or downloads the content saved in `cloud_asset`.
 */
const getCurrentCopy = async (
  remoteFileId: string,
  getExtension: (asset: CloudAssetEntry) => string,
  signal: AbortSignal,
): Promise<string | null> => {
  const asset = await photosLocalDB.getCloudAssetById(remoteFileId);
  const savedContent = getSavedContent(asset);
  if (!asset || !savedContent) {
    logger.warn(`[PhotoAssetFetchService] No fileId/bucket for ${remoteFileId}`);
    return null;
  }
  const extension = getExtension(asset);
  const currentContent = await fetchCurrentContent(remoteFileId);

  if (!currentContent) {
    const cachedCopies = await findCachedCopies(remoteFileId);
    if (cachedCopies.length > 0) {
      return cachedCopies[0].path;
    }
    return downloadContent(remoteFileId, savedContent, extension, signal);
  }

  if (currentContent.fileId !== savedContent.fileId) {
    await photosLocalDB.upsertCloudAsset({
      ...asset,
      fileId: currentContent.fileId,
      bucket: currentContent.bucket,
      fileSize: currentContent.size,
    });
  }
  return getCopyOfContent(remoteFileId, currentContent, extension, signal);
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

    const [photoPath, videoPath] = await Promise.all([
      getCurrentCopy(item.id, () => extFromFileName(item.fileName), signal),
      getCurrentCopy(item.pairedVideoRemoteFileId, (asset) => asset.extension ?? LIVE_PHOTO_VIDEO_TYPE, signal),
    ]);

    if (!photoPath || !videoPath || signal.aborted) {
      return null;
    }

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

  /** Deletes every cached copy of a Live Photo video, whatever content it holds and whatever its name format. */
  evictCachedPairedVideo: async (pairedVideoRemoteFileId: string): Promise<void> => {
    const cachedCopies = await findCachedCopies(pairedVideoRemoteFileId);
    for (const cachedCopy of cachedCopies) {
      await fileSystemService.unlinkIfExists(cachedCopy.path);
    }
  },
};
