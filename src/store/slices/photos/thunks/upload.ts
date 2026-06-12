import { createAsyncThunk } from '@reduxjs/toolkit';
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { AbortError } from 'src/network/errors';
import { HTTP_QUOTA_EXCEEDED } from 'src/services/common/httpStatusCodes';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { AssetUploadJob, PhotoUploadQueue } from 'src/services/photos/PhotoUploadQueue';
import { PhotoUploadResult, uploadSingleFile } from 'src/services/photos/PhotoUploadService';
import { retryIncompleteBursts } from 'src/services/photos/burst/BurstUploadHandler';
import { AssetSyncStatus, photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { isPermissionActive } from 'src/services/photos/photoPermissionService';
import { logger } from '../../../../services/common';
import { RootState } from '../../../index';
import { storageSelectors } from '../../storage';
import type { PhotoNetworkCondition } from '../index';
import { photosSlice, runBackupCycleThunk } from '../index';

type NetworkPauseStatus = 'paused-no-connection' | 'paused-no-wifi' | null;

const evaluateNetworkPause = (
  state: Network.NetworkState,
  networkCondition: PhotoNetworkCondition,
): NetworkPauseStatus => {
  const hasConnection = state.isConnected !== false && state.type !== Network.NetworkStateType.NONE;
  if (!hasConnection) {
    return 'paused-no-connection';
  }
  if (networkCondition === 'wifi-only' && state.type !== Network.NetworkStateType.WIFI) {
    return 'paused-no-wifi';
  }
  return null;
};

const buildUploadJobs = (
  pendingAssets: Array<{ assetId: string; status: AssetSyncStatus; remoteFileId: string | null }>,
  assetById: Map<string, MediaLibrary.Asset>,
): AssetUploadJob[] =>
  pendingAssets.flatMap((dbAsset) => {
    const asset = assetById.get(dbAsset.assetId);
    if (!asset) return [];
    if (dbAsset.status === 'pending_edit') {
      // TODO: this is temporary, maybe we should store the hash of the content in the servers
      // to detect edits reliably and avoid re-uploads of edited assets unchanged in content.
      if (!dbAsset.remoteFileId)
        throw new Error(
          `[Upload] Asset ${dbAsset.assetId} is pending_edit but has no remote_file_id — DB may be corrupted`,
        );
      return [{ asset, existingRemoteFileId: dbAsset.remoteFileId }];
    }
    return [{ asset }];
  });

const completeSyncForAsset = async (
  assetId: string,
  result: PhotoUploadResult,
  modificationTime: number,
): Promise<void> => {
  const status = result.burst ? null : await photosLocalDB.getStatus(assetId);

  if (result.burst) {
    await photosLocalDB.markSyncedBurst(
      assetId,
      result.photoUuid,
      modificationTime,
      result.burst.burstId,
      result.burst.memberUuids,
      result.burst.memberUuids.length,
    );
  } else if (status?.isBurst) {
    // BURST: representative detected in discovery (is_burst=1) but exportBurstMembers returned 0
    // members — most likely limited photo access ("Selected Photos"). Mark synced with
    // memberCount=null so the retry pass re-attempts member export on the next upload cycle.
    await photosLocalDB.markSyncedBurst(assetId, result.photoUuid, modificationTime, assetId, [], null);
  } else if (result.pairedVideoUuid !== undefined) {
    await photosLocalDB.markSyncedLivePhoto(
      assetId,
      result.photoUuid,
      modificationTime,
      result.pairedVideoUuid,
      'synced',
    );
  } else if (status?.isLivePhoto) {
    await photosLocalDB.markSyncedLivePhoto(assetId, result.photoUuid, modificationTime, null, 'error');
  } else {
    await photosLocalDB.markSynced(assetId, result.photoUuid, modificationTime);
  }
};

const hasRemainingAssets = async (isIOS: boolean): Promise<boolean> => {
  const remainingPending = await photosLocalDB.getPendingAssets();
  const remainingBursts = isIOS ? await photosLocalDB.getIncompleteBurstAssets() : [];
  return remainingPending.length > 0 || remainingBursts.length > 0;
};

export const runUploadThunk = createAsyncThunk<void, { bypassEnabled?: boolean } | void, { state: RootState }>(
  'photos/runUpload',
  async (args, { getState, dispatch }) => {
    const bypassEnabled = args?.bypassEnabled ?? false;
    const { enabled, permissionStatus, deviceId, photosBucket, isPaused, networkCondition } = getState().photos;
    if (
      (!enabled && !bypassEnabled) ||
      !isPermissionActive(permissionStatus) ||
      !deviceId ||
      !photosBucket ||
      isPaused
    ) {
      return;
    }
    const initialNetworkState = await Network.getNetworkStateAsync();
    const pauseStatus = evaluateNetworkPause(initialNetworkState, networkCondition);
    if (pauseStatus) {
      dispatch(photosSlice.actions.setSyncStatus(pauseStatus));
      return;
    }
    const networkSubscription = Network.addNetworkStateListener((state) => {
      const pauseStatusSub = evaluateNetworkPause(state, networkCondition);
      if (pauseStatusSub) {
        dispatch(photosSlice.actions.setSyncStatus(pauseStatusSub));
        PhotoUploadQueue.abortAll();
      }
    });

    try {
      const isIOS = Platform.OS === 'ios';
      const availableStorage = storageSelectors.availableStorage(getState());
      if (availableStorage <= 0) {
        dispatch(photosSlice.actions.pauseForQuotaExceeded());
        return;
      }
      dispatch(photosSlice.actions.setDisabledReason(null));

      const localDBPendingAssets = await photosLocalDB.getPendingAssets();
      const incompleteBurstAssets = isIOS ? await photosLocalDB.getIncompleteBurstAssets() : [];
      logger.info(`[Upload] pending=${localDBPendingAssets.length} incompleteBursts=${incompleteBurstAssets.length}`);
      if (localDBPendingAssets.length === 0 && incompleteBurstAssets.length === 0) {
        dispatch(photosSlice.actions.setSyncStatus('synced'));
        return;
      }

      const pendingAssetIds = localDBPendingAssets.map((asset) => asset.assetId);
      const resolvedAssets = await PhotoAssetScanner.getAssetsByIds(pendingAssetIds);
      const assetById = new Map(resolvedAssets.map((a) => [a.id, a]));

      const uploadAssetJobs = buildUploadJobs(localDBPendingAssets, assetById);

      dispatch(photosSlice.actions.setSyncStatus('uploading'));
      dispatch(photosSlice.actions.setSessionUploadTotalAssets(uploadAssetJobs.length + incompleteBurstAssets.length));

      // BURST: retry incomplete burst members before the main queue so the user sees the result
      // immediately (e.g. after granting full Photos access), without waiting for all pending assets.
      if (isIOS && !getState().photos.isPaused) {
        const completedBursts = await retryIncompleteBursts({
          deviceId,
          photosBucket,
          uploadMember: uploadSingleFile,
        });
        for (let i = 0; i < completedBursts; i++) {
          dispatch(photosSlice.actions.incrementSessionUploadedAssets());
          dispatch(photosSlice.actions.incrementTotalAssetsUploaded());
        }
      }

      await PhotoUploadQueue.start(uploadAssetJobs, deviceId, photosBucket, {
        onAssetStart: (assetId) => {
          dispatch(photosSlice.actions.addUploadingAssetId(assetId));
        },
        onAssetProgress: (_, ratio) => {
          dispatch(photosSlice.actions.setCurrentUploadProgress(ratio));
        },
        onAssetDone: async (assetId, result, modificationTime) => {
          await completeSyncForAsset(assetId, result, modificationTime);
          dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
          dispatch(photosSlice.actions.incrementTotalAssetsUploaded());
          dispatch(photosSlice.actions.incrementSessionUploadedAssets());
        },
        onAssetError: async (assetId, error) => {
          const isQuotaError = (error as { status?: number })?.status === HTTP_QUOTA_EXCEEDED;
          if (isQuotaError) {
            dispatch(photosSlice.actions.pauseForQuotaExceeded());
            dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
            PhotoUploadQueue.abortAll();
            return;
          }

          if (error.name === AbortError.errorName) {
            logger.info(`[Upload] Asset ${assetId} aborted (pause or wifi loss)`);
            dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
            return;
          }
          logger.error(`[Upload] Asset ${assetId} failed: ${error?.message ?? String(error)}`);
          await photosLocalDB.markError(assetId, error.message);
          dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
        },
      });

      const {
        isPaused: finalIsPaused,
        disabledReason: finalDisabledReason,
        syncStatus: finalSyncStatus,
      } = getState().photos;

      if (finalSyncStatus === 'paused-no-wifi' || finalSyncStatus === 'paused-no-connection') {
        return;
      }
      dispatch(photosSlice.actions.setSyncStatus(finalIsPaused || finalDisabledReason !== null ? 'paused' : 'synced'));
      dispatch(photosSlice.actions.setCurrentUploadProgress(0));

      if (!finalIsPaused && finalDisabledReason === null && (await hasRemainingAssets(isIOS))) {
        logger.info('[Upload] Work remains after this cycle — restarting');
        dispatch(runBackupCycleThunk());
      }
    } finally {
      networkSubscription.remove();
    }
  },
);
