import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Network from 'expo-network';
import { AbortError } from 'src/network/errors';
import asyncStorageService from 'src/services/AsyncStorageService';
import errorService from 'src/services/ErrorService';
import { HTTP_QUOTA_EXCEEDED } from 'src/services/common/httpStatusCodes';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { photoCloudBrowser } from 'src/services/photos/PhotoCloudBrowser';
import { PhotoDeduplicator } from 'src/services/photos/PhotoDeduplicator';
import { PhotoDeviceManager } from 'src/services/photos/PhotoDeviceId';
import { PhotoUploadQueue } from 'src/services/photos/PhotoUploadQueue';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import {
  isPermissionActive,
  photoPermissionService,
  PhotoPermissionStatus,
} from 'src/services/photos/photoPermissionService';
import { AsyncStorageKey } from 'src/types';
import { logger } from '../../../services/common';
import { RootState } from '../../index';
import { storageSelectors } from '../storage';

export type PhotoNetworkCondition = 'wifi-only' | 'wifi-and-data';
export type PhotoSyncStatus =
  | 'idle'
  | 'scanning'
  | 'uploading'
  | 'pausing'
  | 'synced'
  | 'paused'
  | 'paused-no-wifi'
  | 'error';
export type PhotosDisabledReason = 'quota-exceeded' | null;

export interface PhotosState {
  enabled: boolean;
  networkCondition: PhotoNetworkCondition;
  permissionStatus: PhotoPermissionStatus;
  syncStatus: PhotoSyncStatus;
  isPaused: boolean;
  pendingBackupAssets: number;
  totalScannedAssets: number;
  totalAssetsUploaded: number;
  currentUploadProgress: number;
  uploadingAssetIds: string[];
  deviceId: string | null;
  photosBucket: string | null;
  sessionTotalAssets: number;
  sessionUploadedAssets: number;
  cloudFetchRevision: number;
  isFetchingCloudHistory: boolean;
  disabledReason: PhotosDisabledReason;
}

const initialState: PhotosState = {
  enabled: false,
  networkCondition: 'wifi-only',
  permissionStatus: 'undetermined',
  syncStatus: 'idle',
  isPaused: false,
  pendingBackupAssets: 0,
  totalScannedAssets: 0,
  totalAssetsUploaded: 0,
  currentUploadProgress: 0,
  uploadingAssetIds: [],
  deviceId: null,
  photosBucket: null,
  sessionTotalAssets: 0,
  sessionUploadedAssets: 0,
  cloudFetchRevision: 0,
  isFetchingCloudHistory: false,
  disabledReason: null,
};

const persistPhotosSettings = async (state: PhotosState): Promise<void> => {
  const {
    enabled,
    networkCondition,
    permissionStatus,
    isPaused,
    deviceId,
    photosBucket,
    totalAssetsUploaded,
    pendingBackupAssets,
  } = state;
  await asyncStorageService.saveItem(
    AsyncStorageKey.PhotosSettings,
    JSON.stringify({
      enabled,
      networkCondition,
      permissionStatus,
      isPaused,
      deviceId,
      photosBucket,
      totalAssetsUploaded,
      pendingBackupAssets,
    }),
  );
};

export const hydratePhotosStateThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/setState',
  async (_, { dispatch }) => {
    await photosLocalDB.init();
    const persistedState = await asyncStorageService.getItem(AsyncStorageKey.PhotosSettings);
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState) as Partial<PhotosState>;
        const {
          enabled,
          networkCondition,
          permissionStatus,
          isPaused,
          deviceId,
          photosBucket,
          totalAssetsUploaded,
          pendingBackupAssets,
        } = parsed;
        const stable = {
          enabled,
          networkCondition,
          permissionStatus,
          isPaused,
          deviceId,
          photosBucket,
          totalAssetsUploaded,
          pendingBackupAssets,
        };
        const defined = Object.fromEntries(
          Object.entries(stable).filter(([, v]) => v !== undefined),
        ) as Partial<PhotosState>;
        dispatch(photosSlice.actions.setState(defined));
      } catch (error) {
        logger.error('Failed to parse photos settings from storage', { error });
      }
    }
  },
);

export const enableBackupThunk = createAsyncThunk<
  { isGranted: boolean; permissionStatus: PhotoPermissionStatus },
  void,
  { state: RootState }
>('photos/enableBackup', async (_, { getState, dispatch }) => {
  const currentStatus = await photoPermissionService.getStatus();

  let permissionStatus: PhotoPermissionStatus;
  if (isPermissionActive(currentStatus)) {
    permissionStatus = currentStatus;
  } else {
    permissionStatus = await photoPermissionService.requestPermission();
  }

  const isGranted = isPermissionActive(permissionStatus);
  const state = getState().photos;
  const updated: PhotosState = { ...state, enabled: isGranted, permissionStatus };
  dispatch(photosSlice.actions.setState({ enabled: isGranted, permissionStatus }));

  await persistPhotosSettings(updated);

  if (isGranted) {
    dispatch(runBackupCycleThunk());
  }

  return { isGranted, permissionStatus };
});

export const disableBackupThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/disableBackup',
  async (_, { getState, dispatch }) => {
    const state = getState().photos;
    dispatch(photosSlice.actions.setEnabled(false));
    await persistPhotosSettings({ ...state, enabled: false });
  },
);

export const checkPermissionRevocationThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/checkPermissionRevocation',
  async (_, { getState, dispatch }) => {
    const { enabled } = getState().photos;
    if (!enabled) return;

    const status = await photoPermissionService.getStatus();
    if (status === 'denied') {
      await dispatch(disableBackupThunk());
      dispatch(photosSlice.actions.setPermissionStatus('denied'));
    } else {
      dispatch(photosSlice.actions.setPermissionStatus(status));
    }
  },
);

export const initDeviceIdThunk = createAsyncThunk<string, void, { state: RootState }>(
  'photos/initDeviceId',
  async (_, { dispatch }) => {
    const { deviceId, bucket } = await PhotoDeviceManager.ensureDeviceFolder();
    dispatch(photosSlice.actions.setDeviceId(deviceId));
    dispatch(photosSlice.actions.setPhotosBucket(bucket));
    return deviceId;
  },
);

export const runDiscoveryThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/runDiscovery',
  async (_, { getState, dispatch }) => {
    const { enabled, syncStatus } = getState().photos;
    if (!enabled || syncStatus === 'scanning') return;

    logger.info('[Discovery] Starting discovery cycle');
    dispatch(photosSlice.actions.setSyncStatus('scanning'));
    try {
      await photosLocalDB.init();
      const scannedAssets = await PhotoAssetScanner.scanAll();
      const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync(scannedAssets);
      await Promise.all([
        ...newAssets.map((asset) =>
          photosLocalDB.markPending(asset.id, {
            fileName: asset.filename,
            creationTime: asset.creationTime,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            mediaType: asset.mediaType,
          }),
        ),
        ...editedAssets.map((asset) =>
          photosLocalDB.markPendingEdit(asset.id, {
            fileName: asset.filename,
            creationTime: asset.creationTime,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            mediaType: asset.mediaType,
          }),
        ),
      ]);
      const allPendingAssets = await photosLocalDB.getPendingAssets();
      dispatch(
        photosSlice.actions.setDiscoveryResult({
          pendingBackupAssets: allPendingAssets.length,
          totalScannedAssets: scannedAssets.length,
        }),
      );
      dispatch(photosSlice.actions.setSyncStatus('idle'));
      logger.info(
        `[Discovery] Complete — scanned: ${scannedAssets.length}, new: ${newAssets.length}, edited: ${editedAssets.length}`,
      );
    } catch (error) {
      logger.error('[Discovery] Failed', { error });
      dispatch(photosSlice.actions.setSyncStatus('error'));
    }
  },
);

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
    let wifiSubscription: ReturnType<typeof Network.addNetworkStateListener> | null = null;
    if (networkCondition === 'wifi-only') {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        dispatch(photosSlice.actions.setSyncStatus('paused-no-wifi'));
        return;
      }
      wifiSubscription = Network.addNetworkStateListener((state) => {
        if (state.type !== Network.NetworkStateType.WIFI) {
          dispatch(photosSlice.actions.setSyncStatus('paused-no-wifi'));
          PhotoUploadQueue.abortAll();
        }
      });
    }

    const availableStorage = storageSelectors.availableStorage(getState());
    if (availableStorage <= 0) {
      dispatch(photosSlice.actions.pauseForQuotaExceeded());
      return;
    }
    dispatch(photosSlice.actions.setDisabledReason(null));

    const localDBPendingAssets = await photosLocalDB.getPendingAssets();
    if (localDBPendingAssets.length === 0) {
      dispatch(photosSlice.actions.setSyncStatus('synced'));
      return;
    }

    const pendingAssetIds = localDBPendingAssets.map((asset) => asset.assetId);
    const resolvedAssets = await PhotoAssetScanner.getAssetsByIds(pendingAssetIds);
    const assetById = new Map(resolvedAssets.map((a) => [a.id, a]));

    const uploadAssetJobs = localDBPendingAssets.flatMap((dbAsset) => {
      const asset = assetById.get(dbAsset.assetId);
      if (!asset) return [];
      if (dbAsset.status === 'pending_edit') {
        // TODO: this is temporary, maybe we should store the hash
        // of the content in the servers to have a more reliable way to
        // detect edits and avoid re-uploads of edited assets that haven't changed in content
        if (!dbAsset.remoteFileId)
          throw new Error(
            `[Upload] Asset ${dbAsset.assetId} is pending_edit but has no remote_file_id — DB may be corrupted`,
          );
        return [{ asset, existingRemoteFileId: dbAsset.remoteFileId }];
      }
      return [{ asset }];
    });

    dispatch(photosSlice.actions.setSyncStatus('uploading'));
    dispatch(photosSlice.actions.setSessionUploadTotalAssets(uploadAssetJobs.length));

    try {
      await PhotoUploadQueue.start(uploadAssetJobs, deviceId, photosBucket, {
        onAssetStart: (assetId) => {
          dispatch(photosSlice.actions.addUploadingAssetId(assetId));
        },
        onAssetProgress: (_, ratio) => {
          dispatch(photosSlice.actions.setCurrentUploadProgress(ratio));
        },
        onAssetDone: async (assetId, remoteFileId, modificationTime) => {
          await photosLocalDB.markSynced(assetId, remoteFileId, modificationTime);
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
    } finally {
      wifiSubscription?.remove();
    }

    const {
      isPaused: finalIsPaused,
      disabledReason: finalDisabledReason,
      syncStatus: finalSyncStatus,
    } = getState().photos;

    if (finalSyncStatus === 'paused-no-wifi') {
      return;
    }
    dispatch(photosSlice.actions.setSyncStatus(finalIsPaused || finalDisabledReason !== null ? 'paused' : 'synced'));
    dispatch(photosSlice.actions.setCurrentUploadProgress(0));

    if (!finalIsPaused && finalDisabledReason === null) {
      const remaining = await photosLocalDB.getPendingAssets();
      if (remaining.length > 0) {
        // Assets remain pending (e.g. queue was aborted mid-run and user resumed while draining).
        // runBackupCycleThunk was skipped by the 'pausing' guard — restart it now.
        logger.info(`[Upload] ${remaining.length} pending assets remain after queue — restarting cycle`);
        dispatch(runBackupCycleThunk());
      }
    }
  },
);

export const runFullCloudHistorySyncThunk = createAsyncThunk<void, { force?: boolean } | void, { state: RootState }>(
  'photos/runFullCloudHistorySync',
  async (args, { getState, dispatch }) => {
    const force = args?.force ?? false;
    logger.info('[CloudHistorySync] Starting full cloud history sync');
    dispatch(photosSlice.actions.setIsFetchingCloudHistory(true));
    try {
      await photosLocalDB.init();
      await photoCloudBrowser.syncAllHistory({
        force,
        onMonthFetched: () => dispatch(photosSlice.actions.incrementCloudFetchRevision()),
        isCancelled: () => !getState().photos.enabled,
        currentDeviceId: getState().photos.deviceId ?? undefined,
      });
      logger.info('[CloudHistorySync] Full history sync complete');
    } catch (error) {
      logger.error('[CloudHistorySync] Error during full cloud history sync', { error });
    } finally {
      dispatch(photosSlice.actions.setIsFetchingCloudHistory(false));
    }
  },
  {
    condition: (_, { getState }) => !getState().photos.isFetchingCloudHistory,
  },
);

export const forceRefreshThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/forceRefresh',
  async (_, { getState, dispatch }) => {
    const { enabled, syncStatus, isFetchingCloudHistory } = getState().photos;
    if (!enabled || syncStatus === 'scanning' || syncStatus === 'uploading' || isFetchingCloudHistory) {
      logger.info(
        `[ForceRefresh] Skipped — enabled: ${enabled}, syncStatus: ${syncStatus}, isFetchingCloudHistory: ${isFetchingCloudHistory}`,
      );
      return;
    }

    logger.info('[ForceRefresh] Starting — dispatching cloud sync (force) + local discovery');
    dispatch(runFullCloudHistorySyncThunk({ force: true }));

    await dispatch(runDiscoveryThunk()).unwrap();
    const pending = getState().photos.pendingBackupAssets;
    if (pending > 0) {
      logger.info(`[ForceRefresh] Discovery found ${pending} pending assets — starting upload`);
      await dispatch(runUploadThunk()).unwrap();
    } else {
      logger.info('[ForceRefresh] Discovery complete — no pending assets');
    }
    logger.info('[ForceRefresh] Done');
  },
);

export const runBackupCycleThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/runBackupCycle',
  async (_, { getState, dispatch }) => {
    const { syncStatus } = getState().photos;
    if (syncStatus === 'scanning' || syncStatus === 'uploading' || syncStatus === 'pausing') {
      return;
    }

    await dispatch(checkPermissionRevocationThunk());
    const { enabled, permissionStatus, deviceId, photosBucket } = getState().photos;
    if (!enabled || !isPermissionActive(permissionStatus)) {
      return;
    }

    if (!deviceId || !photosBucket) {
      await dispatch(initDeviceIdThunk());
    }

    dispatch(runFullCloudHistorySyncThunk());

    await dispatch(runDiscoveryThunk());

    const { isPaused, pendingBackupAssets } = getState().photos;

    if (isPaused) {
      // Discovery sets syncStatus to 'idle'; restore 'paused' so the UI shows the play button.
      dispatch(photosSlice.actions.setSyncStatus('paused'));
      // Persist the updated pendingBackupAssets so the count survives the next app restart.
      await persistPhotosSettings(getState().photos);
      return;
    }

    if (pendingBackupAssets > 0) {
      await dispatch(runUploadThunk());
    }
  },
);

export const pauseBackupThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/pauseBackup',
  async (_, { getState, dispatch }) => {
    const state = getState().photos;
    dispatch(photosSlice.actions.setIsPaused(true));
    dispatch(photosSlice.actions.setSyncStatus('pausing'));
    await persistPhotosSettings({ ...state, isPaused: true });
    PhotoUploadQueue.abortAll();
  },
);

export const resumeBackupThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/resumeBackup',
  async (_, { getState, dispatch }) => {
    const state = getState().photos;
    dispatch(photosSlice.actions.setIsPaused(false));
    dispatch(photosSlice.actions.setSyncStatus('idle'));
    await persistPhotosSettings({ ...state, isPaused: false });
    dispatch(runBackupCycleThunk());
  },
);

export const setNetworkConditionThunk = createAsyncThunk<void, PhotoNetworkCondition, { state: RootState }>(
  'photos/setNetworkCondition',
  async (value, { getState, dispatch }) => {
    const state = getState().photos;
    dispatch(photosSlice.actions.setNetworkCondition(value));
    await persistPhotosSettings({ ...state, networkCondition: value });
    if (value === 'wifi-only' && state.syncStatus === 'uploading') {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        dispatch(photosSlice.actions.setSyncStatus('paused-no-wifi'));
        PhotoUploadQueue.abortAll();
      }
    }
  },
);

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setNetworkCondition: (state, action: PayloadAction<PhotoNetworkCondition>) => {
      state.networkCondition = action.payload;
    },
    setPermissionStatus: (state, action: PayloadAction<PhotoPermissionStatus>) => {
      state.permissionStatus = action.payload;
    },
    setState: (state, action: PayloadAction<Partial<PhotosState>>) => {
      return { ...state, ...action.payload };
    },
    setSyncStatus: (state, action: PayloadAction<PhotoSyncStatus>) => {
      state.syncStatus = action.payload;
    },
    setIsPaused: (state, action: PayloadAction<boolean>) => {
      state.isPaused = action.payload;
    },
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },
    setPhotosBucket: (state, action: PayloadAction<string>) => {
      state.photosBucket = action.payload;
    },
    setDiscoveryResult: (state, action: PayloadAction<{ pendingBackupAssets: number; totalScannedAssets: number }>) => {
      state.pendingBackupAssets = action.payload.pendingBackupAssets;
      state.totalScannedAssets = action.payload.totalScannedAssets;
    },
    addUploadingAssetId: (state, action: PayloadAction<string>) => {
      if (!state.uploadingAssetIds.includes(action.payload)) {
        state.uploadingAssetIds.push(action.payload);
      }
    },
    removeUploadingAssetId: (state, action: PayloadAction<string>) => {
      state.uploadingAssetIds = state.uploadingAssetIds.filter((id) => id !== action.payload);
    },
    setCurrentUploadProgress: (state, action: PayloadAction<number>) => {
      state.currentUploadProgress = action.payload;
    },
    incrementTotalAssetsUploaded: (state) => {
      state.totalAssetsUploaded += 1;
    },
    setSessionUploadTotalAssets: (state, action: PayloadAction<number>) => {
      state.sessionTotalAssets = action.payload;
      state.sessionUploadedAssets = 0;
    },
    incrementSessionUploadedAssets: (state) => {
      state.sessionUploadedAssets += 1;
    },
    incrementCloudFetchRevision: (state) => {
      state.cloudFetchRevision += 1;
    },
    setIsFetchingCloudHistory: (state, action: PayloadAction<boolean>) => {
      state.isFetchingCloudHistory = action.payload;
    },
    setDisabledReason: (state, action: PayloadAction<PhotosDisabledReason>) => {
      state.disabledReason = action.payload;
    },
    pauseForQuotaExceeded: (state) => {
      state.syncStatus = 'paused';
      state.disabledReason = 'quota-exceeded';
    },
  },
});

export const photosActions = photosSlice.actions;

export const signOutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/signOut',
  async (_, { dispatch }) => {
    await Promise.all([photosLocalDB.reset(), photosLocalDB.resetCloudAssets()]).catch(errorService.reportError);
    dispatch(photosActions.resetState());
  },
);

export default photosSlice.reducer;
