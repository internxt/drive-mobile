import { AnyAction, createAsyncThunk, ThunkDispatch } from '@reduxjs/toolkit';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { AbortError } from 'src/network/errors';
import { networkMonitorService, NetworkState, NetworkStateType } from 'src/services/NetworkMonitorService';
import { HTTP_QUOTA_EXCEEDED } from 'src/services/common/httpStatusCodes';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { photoSyncManifestService } from 'src/services/photos/PhotoSyncManifestService';
import { AssetUploadJob, PhotoUploadQueue } from 'src/services/photos/PhotoUploadQueue';
import { PhotoUploadEvent, PhotoUploadResult, uploadSingleFile } from 'src/services/photos/PhotoUploadService';
import { retryIncompleteBursts } from 'src/services/photos/burst/BurstUploadHandler';
import { AssetSyncStatus, photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { isPermissionActive } from 'src/services/photos/photoPermissionService';
import { logger } from '../../../../services/common';
import { RootState } from '../../../index';
import { storageSelectors } from '../../storage';
import type { PhotoNetworkCondition } from '../index';
import { photosSlice, runBackupCycleThunk } from '../index';

type NetworkPauseStatus = 'paused-no-connection' | 'paused-no-wifi' | null;

const PROGRESS_STEP = 0.02;
const REPRESENTATIVE_ASSET_COUNT = 1;

export const evaluateNetworkPause = (
  state: NetworkState,
  networkCondition: PhotoNetworkCondition,
): NetworkPauseStatus => {
  const hasConnection = state.isConnected !== false && state.type !== NetworkStateType.NONE;
  if (!hasConnection) {
    return 'paused-no-connection';
  }
  if (networkCondition === 'wifi-only' && state.type !== NetworkStateType.WIFI) {
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

export const completeSyncForAsset = async (
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

const isQuotaExceededError = (error: Error): boolean => (error as { status?: number })?.status === HTTP_QUOTA_EXCEEDED;

const isAbortSignalError = (error: Error): boolean => error.name === AbortError.errorName;

type UploadThunkDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

const finishAssetUpload = async (
  dispatch: UploadThunkDispatch,
  assetId: string,
  result: PhotoUploadResult,
  modificationTime: number,
): Promise<void> => {
  await completeSyncForAsset(assetId, result, modificationTime);
  dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
  dispatch(photosSlice.actions.incrementTotalAssetsUploaded());
};

const finishAssetUploadInCycle = async (
  dispatch: UploadThunkDispatch,
  assetId: string,
  result: PhotoUploadResult,
  modificationTime: number,
): Promise<void> => {
  await finishAssetUpload(dispatch, assetId, result, modificationTime);
  dispatch(photosSlice.actions.markAssetUploadCompleted(assetId));
};

type AssetErrorOutcome = 'quota' | 'aborted' | 'failed';

const handleAssetUploadError = async (
  dispatch: UploadThunkDispatch,
  assetId: string,
  error: Error,
): Promise<AssetErrorOutcome> => {
  dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
  if (isQuotaExceededError(error)) {
    dispatch(photosSlice.actions.pauseForQuotaExceeded());
    return 'quota';
  }
  if (isAbortSignalError(error)) {
    logger.info(`[Upload] Asset ${assetId} aborted (pause or wifi loss)`);
    return 'aborted';
  }
  logger.error(`[Upload] Asset ${assetId} failed: ${error?.message ?? String(error)}`);
  await photosLocalDB.markError(assetId, error.message);
  return 'failed';
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
    if (PhotoUploadQueue.isCycleRunning()) {
      logger.info('[Upload] Skipped — an upload cycle is already running');
      return;
    }

    const uploadCycleAbortSignal = PhotoUploadQueue.beginCycle();
    const unsubscribeNetworkMonitor = networkMonitorService.subscribe((state) => {
      const pauseStatusSub = evaluateNetworkPause(state, networkCondition);
      if (pauseStatusSub) {
        dispatch(photosSlice.actions.setSyncStatus(pauseStatusSub));
        PhotoUploadQueue.abortAll();
      }
    });

    try {
      const initialNetworkState = await networkMonitorService.getNetworkStateAsync();
      const pauseStatus = evaluateNetworkPause(initialNetworkState, networkCondition);
      if (pauseStatus) {
        dispatch(photosSlice.actions.setSyncStatus(pauseStatus));
        return;
      }
      const isIOS = Platform.OS === 'ios';
      const availableStorage = storageSelectors.availableStorage(getState());
      if (availableStorage <= 0) {
        dispatch(photosSlice.actions.pauseForQuotaExceeded());
        return;
      }
      dispatch(photosSlice.actions.setDisabledReason(null));

      const localDBPendingAssets = await photosLocalDB.getPendingAssets();

      // Bursts trusted enough to suppress the representative's progress below (else the bar fills
      // to 100% then drops). Untrusted when access is 'limited' and there's no prior member count.
      const knownBurstAssetIds = new Set(
        localDBPendingAssets
          .filter((asset) => asset.isBurst && (asset.burstMemberCount != null || permissionStatus !== 'limited'))
          .map((asset) => asset.assetId),
      );
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

      const applyBurstEvent = (assetId: string, event: PhotoUploadEvent) => {
        switch (event.type) {
          case 'burst-member-total': {
            const totalFiles = event.total + REPRESENTATIVE_ASSET_COUNT;
            dispatch(photosSlice.actions.setBurstUploadTotal({ assetId, total: event.total }));
            dispatch(
              photosSlice.actions.setAssetUploadProgress({
                assetId,
                progress: REPRESENTATIVE_ASSET_COUNT / totalFiles,
              }),
            );
            break;
          }
          case 'burst-member-uploaded': {
            dispatch(photosSlice.actions.incrementBurstMemberUploaded({ assetId }));
            const burstProgress = getState().photos.burstUploadProgressById[assetId];
            if (burstProgress) {
              const uploadedFiles = burstProgress.uploaded + REPRESENTATIVE_ASSET_COUNT;
              const totalFiles = burstProgress.total + REPRESENTATIVE_ASSET_COUNT;
              dispatch(photosSlice.actions.setAssetUploadProgress({ assetId, progress: uploadedFiles / totalFiles }));
            }
            break;
          }
        }
      };

      // BURST: retry incomplete burst members before the main queue so the user sees the result
      // immediately (e.g. after granting full Photos access), without waiting for all pending assets.
      if (isIOS && !getState().photos.isPaused) {
        const completedBursts = await retryIncompleteBursts({
          deviceId,
          photosBucket,
          signal: uploadCycleAbortSignal,
          uploadMember: uploadSingleFile,
          onBurstEvent: applyBurstEvent,
        });
        for (let i = 0; i < completedBursts; i++) {
          dispatch(photosSlice.actions.incrementSessionUploadedAssets());
          dispatch(photosSlice.actions.incrementTotalAssetsUploaded());
        }
      }

      const lastDispatchedUploadProgressStep = new Map<string, number>();

      await PhotoUploadQueue.start(uploadAssetJobs, deviceId, photosBucket, {
        onAssetStart: (assetId) => {
          dispatch(photosSlice.actions.addUploadingAssetId(assetId));
        },
        onAssetProgress: (assetId, ratio) => {
          if (knownBurstAssetIds.has(assetId)) {
            return;
          }
          const progressStep = Math.floor(ratio / PROGRESS_STEP);
          if (lastDispatchedUploadProgressStep.get(assetId) === progressStep) {
            return;
          }
          lastDispatchedUploadProgressStep.set(assetId, progressStep);
          dispatch(photosSlice.actions.setAssetUploadProgress({ assetId, progress: ratio }));
        },
        onAssetDone: async (assetId, result, modificationTime) => {
          lastDispatchedUploadProgressStep.delete(assetId);
          await finishAssetUploadInCycle(dispatch, assetId, result, modificationTime);
          dispatch(photosSlice.actions.incrementSessionUploadedAssets());
          photoSyncManifestService
            .maybeUploadManifest(deviceId, photosBucket)
            .catch((err) => logger.error('[Upload] Failed to checkpoint sync manifest', err));
        },
        onAssetEvent: applyBurstEvent,
        onAssetError: async (assetId, error) => {
          lastDispatchedUploadProgressStep.delete(assetId);
          const errorOutcome = await handleAssetUploadError(dispatch, assetId, error);
          if (errorOutcome === 'quota') {
            PhotoUploadQueue.abortAll();
          }
        },
      });

      const {
        isPaused: finalIsPaused,
        disabledReason: finalDisabledReason,
        syncStatus: finalSyncStatus,
        sessionUploadedAssets: finalSessionUploadedAssets,
      } = getState().photos;

      if (finalSyncStatus === 'paused-no-wifi' || finalSyncStatus === 'paused-no-connection') {
        return;
      }
      dispatch(photosSlice.actions.setSyncStatus(finalIsPaused || finalDisabledReason !== null ? 'paused' : 'synced'));
      dispatch(photosSlice.actions.clearUploadProgress());
      dispatch(photosSlice.actions.setAssetUploadErroredCount(await photosLocalDB.getAssetUploadErroredCount()));

      const hasUploadSomeAssets = finalSessionUploadedAssets > 0;
      if (hasUploadSomeAssets) {
        photoSyncManifestService
          .uploadManifest(deviceId, photosBucket)
          .catch((err) => logger.error('[Upload] Failed to upload sync manifest', err));
      }
      if (!finalIsPaused && finalDisabledReason === null && hasUploadSomeAssets && (await hasRemainingAssets(isIOS))) {
        logger.info('[Upload] Work remains after this cycle — restarting');
        dispatch(runBackupCycleThunk());
      }
    } finally {
      unsubscribeNetworkMonitor();
      PhotoUploadQueue.endCycle();
    }
  },
);

/**
 * Uploads the given assets for the manual "Backup" action, independent of the automatic backup
 * cycle: not gated by `enabled`/`isPaused`/a running cycle, never marks the asset
 * `pending`, and skips session bookkeeping — so it can't be swallowed by a running cycle or
 * silently resume an entire backlog when backup is off. Not retried automatically if interrupted.
 */
export const uploadAssetsManuallyThunk = createAsyncThunk<
  void,
  { assetIds: string[]; signal: AbortSignal },
  { state: RootState }
>('photos/uploadAssetsNow', async ({ assetIds, signal }, { getState, dispatch }) => {
  if (assetIds.length === 0 || signal.aborted) {
    return;
  }

  const { permissionStatus, deviceId, photosBucket, networkCondition } = getState().photos;
  if (!isPermissionActive(permissionStatus) || !deviceId || !photosBucket) {
    throw new Error('[Upload] uploadAssetsNow — missing device/bucket/permission prerequisites');
  }

  const networkState = await networkMonitorService.getNetworkStateAsync();
  const pauseStatus = evaluateNetworkPause(networkState, networkCondition);
  if (pauseStatus) {
    throw new Error(`[Upload] uploadAssetsNow — blocked by network condition: ${pauseStatus}`);
  }

  const availableStorage = storageSelectors.availableStorage(getState());
  if (availableStorage <= 0) {
    dispatch(photosSlice.actions.pauseForQuotaExceeded());
    throw new Error('[Upload] uploadAssetsNow — storage quota exceeded');
  }

  const resolvedAssets = await PhotoAssetScanner.getAssetsByIds(assetIds);
  const assetById = new Map(resolvedAssets.map((a) => [a.id, a]));
  const jobs: AssetUploadJob[] = assetIds.flatMap((id) => {
    const asset = assetById.get(id);
    return asset ? [{ asset }] : [];
  });
  if (jobs.length === 0) {
    return;
  }

  let uploadError: Error | null = null;

  await PhotoUploadQueue.start(
    jobs,
    deviceId,
    photosBucket,
    {
      onAssetStart: (assetId) => {
        dispatch(photosSlice.actions.addUploadingAssetId(assetId));
      },
      onAssetProgress: (assetId, ratio) => {
        dispatch(photosSlice.actions.setAssetUploadProgress({ assetId, progress: ratio }));
      },
      onAssetDone: async (assetId, result, modificationTime) => {
        await finishAssetUpload(dispatch, assetId, result, modificationTime);
      },
      onAssetError: async (assetId, error) => {
        const errorOutcome = await handleAssetUploadError(dispatch, assetId, error);
        if (errorOutcome !== 'aborted') {
          uploadError ??= error;
        }
      },
    },
    signal,
  );

  if (uploadError) {
    throw uploadError;
  }
});
