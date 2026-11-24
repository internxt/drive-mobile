import { getEnvironmentConfigFromUser } from 'src/lib/network';
import { AbortError } from 'src/network/errors';
import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import fileSystemService from 'src/services/FileSystemService';
import { IncompleteLivePhoto, photosLocalDB } from '../database/photosLocalDB';
import { exportLivePhotoComponents } from '../LivePhotoNativeModule';
import { PhotoAssetScanner } from '../PhotoAssetScanner';
import { photoBackupFolders } from '../PhotoBackupFolders';
import type { PairedVideoUploadParams, UploadCredentials } from '../PhotoUploadService';
import { splitFileNameAndExtension, stripFileSchemeAndFragment } from '../PhotoUploadService.utils';

/** Error codes of the native export that retrying cannot fix. */
const PERMANENT_EXPORT_ERROR_CODES = new Set(['NOT_FOUND', 'NOT_LIVE_PHOTO', 'NO_PHOTO_RESOURCE', 'NO_VIDEO_RESOURCE']);

const isPermanentExportError = (error: unknown): boolean =>
  PERMANENT_EXPORT_ERROR_CODES.has((error as { code?: string })?.code ?? '');

const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === AbortError.errorName;

export interface UploadedPairedVideo {
  /** Creation time of the Live Photo, in ms. */
  creationTime: number;
  /** The video the Live Photo had before the upload, if any. */
  previousPairedVideoUuid: string | null;
}

interface LivePhotoNameAndDates {
  fileName: string;
  creationTime: number;
  modificationTime: number;
}

/**
 * Takes the name and dates of each Live Photo from its `asset_sync` row, and looks up on the device, in one pass,
 * the ones whose row lacks them. A Live Photo missing from the result is no longer on the device.
 */
const resolveNamesAndDates = async (
  incompleteLivePhotos: IncompleteLivePhoto[],
): Promise<Map<string, LivePhotoNameAndDates>> => {
  const namesAndDates = new Map<string, LivePhotoNameAndDates>();
  const assetIdsToLookUp: string[] = [];
  for (const { assetId, fileName, creationTime, modificationTime } of incompleteLivePhotos) {
    if (fileName && creationTime !== null) {
      namesAndDates.set(assetId, { fileName, creationTime, modificationTime: modificationTime ?? creationTime });
    } else {
      assetIdsToLookUp.push(assetId);
    }
  }
  if (assetIdsToLookUp.length > 0) {
    const deviceAssets = await PhotoAssetScanner.getAssetsByIds(assetIdsToLookUp);
    for (const { id, filename, creationTime, modificationTime } of deviceAssets) {
      namesAndDates.set(id, { fileName: filename, creationTime, modificationTime });
    }
  }
  return namesAndDates;
};

export interface LivePhotoRetryResult {
  completedCount: number;
  isQuotaExceeded: boolean;
}

interface RetryIncompleteLivePhotosParams {
  incompleteLivePhotos: IncompleteLivePhoto[];
  deviceId: string;
  photosBucket: string;
  signal?: AbortSignal;
  uploadPairedVideo: (params: PairedVideoUploadParams) => Promise<string>;
  isQuotaExceededError: (error: Error) => boolean;
  onPairedVideoUploaded?: (uploadedPairedVideo: UploadedPairedVideo) => Promise<void>;
}

type LivePhotoRetryOutcome = 'uploaded' | 'failed' | 'cancelled' | 'quotaExceeded';

/** Stops retrying a Live Photo whose export can never succeed, and counts one attempt otherwise. */
const recordExportFailure = async (assetId: string, exportError: unknown): Promise<void> => {
  if (isPermanentExportError(exportError)) {
    logger.warn(`[LivePhotoUpload] ${assetId} can't be exported, not retrying: ${String(exportError)}`);
    await photosLocalDB.stopPairedVideoRetries(assetId);
  } else {
    logger.error(`[LivePhotoUpload] Export failed for ${assetId}: ${String(exportError)}`);
    await photosLocalDB.addPairedVideoAttempt(assetId);
  }
};

/** Exports one Live Photo and uploads its current video, recording the attempt in the local database. */
const retryLivePhotoVideo = async (
  params: Omit<RetryIncompleteLivePhotosParams, 'incompleteLivePhotos' | 'photosBucket'> & {
    livePhoto: IncompleteLivePhoto;
    nameAndDates: LivePhotoNameAndDates | undefined;
    credentials: UploadCredentials;
  },
): Promise<LivePhotoRetryOutcome> => {
  const {
    livePhoto,
    nameAndDates,
    credentials,
    deviceId,
    signal,
    uploadPairedVideo,
    isQuotaExceededError,
    onPairedVideoUploaded,
  } = params;

  if (!nameAndDates) {
    logger.warn(`[LivePhotoUpload] ${livePhoto.assetId} is no longer on the device, not retrying`);
    await photosLocalDB.stopPairedVideoRetries(livePhoto.assetId);
    return 'failed';
  }

  let components;
  try {
    components = await exportLivePhotoComponents(livePhoto.assetId);
  } catch (exportError) {
    await recordExportFailure(livePhoto.assetId, exportError);
    return 'failed';
  }

  const photoLocalPath = stripFileSchemeAndFragment(components.photo.uri);
  const videoLocalPath = stripFileSchemeAndFragment(components.video.uri);
  try {
    const createdDate = new Date(nameAndDates.creationTime);
    const folderUuid = await photoBackupFolders.getOrCreateFolderForDate(deviceId, createdDate);
    const { plainName: photoPlainName } = splitFileNameAndExtension(nameAndDates.fileName);

    const pairedVideoUuid = await uploadPairedVideo({
      videoLocalPath,
      videoFileName: components.video.fileName,
      photoPlainName,
      existingPairedVideoRemoteFileId: livePhoto.pairedVideoRemoteFileId ?? undefined,
      folderUuid,
      creationIso: createdDate.toISOString(),
      modificationIso: new Date(nameAndDates.modificationTime).toISOString(),
      credentials,
      signal,
    });

    await photosLocalDB.markPairedVideoSynced(livePhoto.assetId, pairedVideoUuid);
    await onPairedVideoUploaded?.({
      creationTime: nameAndDates.creationTime,
      previousPairedVideoUuid: livePhoto.pairedVideoRemoteFileId,
    });
    logger.info(`[LivePhotoUpload] Video uploaded for ${livePhoto.assetId}`);
    return 'uploaded';
  } catch (uploadError) {
    if (isAbortError(uploadError) || signal?.aborted) {
      return 'cancelled';
    }
    if (uploadError instanceof Error && isQuotaExceededError(uploadError)) {
      return 'quotaExceeded';
    }
    logger.error(`[LivePhotoUpload] Video upload failed for ${livePhoto.assetId}: ${String(uploadError)}`);
    await photosLocalDB.addPairedVideoAttempt(livePhoto.assetId);
    return 'failed';
  } finally {
    await fileSystemService.unlinkIfExists(photoLocalPath);
    await fileSystemService.unlinkIfExists(videoLocalPath);
  }
};

/**
 * Uploads the current video of each given backed-up Live Photo whose video failed or still has the content from
 * before an edit. A temporary failure adds one attempt; a Live Photo that is no longer on the device or can never
 * be exported uses up all its attempts. Stops without counting an attempt when the cycle is cancelled or the
 * storage quota is exceeded.
 * @param params.uploadPairedVideo - Puts the video in Drive and returns its uuid; must throw on any failure.
 */
export const retryIncompleteLivePhotos = async (
  params: RetryIncompleteLivePhotosParams,
): Promise<LivePhotoRetryResult> => {
  const { incompleteLivePhotos, photosBucket, signal } = params;
  let completedCount = 0;

  if (incompleteLivePhotos.length === 0) {
    return { completedCount, isQuotaExceeded: false };
  }

  const namesAndDates = await resolveNamesAndDates(incompleteLivePhotos);

  const user = await asyncStorageService.getUser();
  const { encryptionKey, bridgeUser, bridgePass } = getEnvironmentConfigFromUser(user);
  const credentials: UploadCredentials = { bucketId: photosBucket, encryptionKey, bridgeUser, bridgePass };

  for (const livePhoto of incompleteLivePhotos) {
    if (signal?.aborted) {
      break;
    }
    const outcome = await retryLivePhotoVideo({
      ...params,
      livePhoto,
      nameAndDates: namesAndDates.get(livePhoto.assetId),
      credentials,
    });
    if (outcome === 'cancelled') {
      break;
    }
    if (outcome === 'quotaExceeded') {
      return { completedCount, isQuotaExceeded: true };
    }
    if (outcome === 'uploaded') {
      completedCount++;
    }
  }

  return { completedCount, isQuotaExceeded: false };
};
