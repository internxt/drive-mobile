import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { PhotoDeduplicator } from 'src/services/photos/PhotoDeduplicator';
import { PhotoDeviceId } from 'src/services/photos/PhotoDeviceId';
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

export type PhotoNetworkCondition = 'wifi-only' | 'wifi-and-data';
export type PhotoSyncStatus = 'idle' | 'scanning' | 'uploading' | 'synced' | 'paused' | 'error';

export interface PhotosState {
  enabled: boolean;
  networkCondition: PhotoNetworkCondition;
  permissionStatus: PhotoPermissionStatus;
  syncStatus: PhotoSyncStatus;
  pendingBackupAssets: number;
  totalScannedAssets: number;
  totalAssetsUploaded: number;
  currentUploadProgress: number;
  lastSyncTimestamp: number | null;
  uploadingAssetIds: string[];
  deviceId: string | null;
  sessionTotalAssets: number;
  sessionUploadedAssets: number;
}

const initialState: PhotosState = {
  enabled: false,
  networkCondition: 'wifi-only',
  permissionStatus: 'undetermined',
  syncStatus: 'idle',
  pendingBackupAssets: 0,
  totalScannedAssets: 0,
  totalAssetsUploaded: 0,
  currentUploadProgress: 0,
  lastSyncTimestamp: null,
  uploadingAssetIds: [],
  deviceId: null,
  sessionTotalAssets: 0,
  sessionUploadedAssets: 0,
};

const persistPhotosSettings = async (state: PhotosState): Promise<void> => {
  await asyncStorageService.saveItem(AsyncStorageKey.PhotosSettings, JSON.stringify(state));
};

export const hydratePhotosStateThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/setState',
  async (_, { dispatch }) => {
    await photosLocalDB.init();
    const persistedState = await asyncStorageService.getItem(AsyncStorageKey.PhotosSettings);
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState) as Partial<PhotosState>;
        dispatch(photosSlice.actions.setState(parsed));
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
  const permissionStatus = await photoPermissionService.requestPermission();
  const isGranted = isPermissionActive(permissionStatus);

  const state = getState().photos;
  const updated: PhotosState = { ...state, enabled: isGranted, permissionStatus };
  dispatch(photosSlice.actions.setState({ enabled: isGranted, permissionStatus }));
  await persistPhotosSettings(updated);

  if (isGranted) {
    await dispatch(initDeviceIdThunk());
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
    const id = await PhotoDeviceId.getOrCreate();
    dispatch(photosSlice.actions.setDeviceId(id));
    return id;
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
        ...newAssets.map((asset) => photosLocalDB.markPending(asset.id)),
        ...editedAssets.map((asset) => photosLocalDB.markPendingEdit(asset.id)),
      ]);
      const pendingCount = newAssets.length + editedAssets.length;
      dispatch(
        photosSlice.actions.setDiscoveryResult({
          pendingBackupAssets: pendingCount,
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

export const runUploadThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/runUpload',
  async (_, { getState, dispatch }) => {
    const { enabled, permissionStatus, deviceId } = getState().photos;
    if (!enabled || !isPermissionActive(permissionStatus) || !deviceId) return;

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

    await PhotoUploadQueue.start(uploadAssetJobs, deviceId, {
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
        logger.error(`[Upload] Asset ${assetId} failed: ${error?.message ?? String(error)}`);
        await photosLocalDB.markError(assetId, error.message);
        dispatch(photosSlice.actions.removeUploadingAssetId(assetId));
      },
    });

    dispatch(photosSlice.actions.setSyncStatus('synced'));
    dispatch(photosSlice.actions.setLastSyncTimestamp(Date.now()));
    dispatch(photosSlice.actions.setCurrentUploadProgress(0));
  },
);

export const runBackupCycleThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/runBackupCycle',
  async (_, { getState, dispatch }) => {
    const { syncStatus } = getState().photos;
    if (syncStatus === 'scanning' || syncStatus === 'uploading') return;

    await dispatch(checkPermissionRevocationThunk());
    const { enabled, permissionStatus, deviceId } = getState().photos;
    if (!enabled || !isPermissionActive(permissionStatus)) return;

    if (!deviceId) await dispatch(initDeviceIdThunk());
    await dispatch(runDiscoveryThunk());

    if (getState().photos.pendingBackupAssets > 0) {
      await dispatch(runUploadThunk());
    }
  },
);

export const setNetworkConditionThunk = createAsyncThunk<void, PhotoNetworkCondition, { state: RootState }>(
  'photos/setNetworkCondition',
  async (value, { getState, dispatch }) => {
    const state = getState().photos;
    dispatch(photosSlice.actions.setNetworkCondition(value));
    await persistPhotosSettings({ ...state, networkCondition: value });
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
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
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
    setLastSyncTimestamp: (state, action: PayloadAction<number>) => {
      state.lastSyncTimestamp = action.payload;
    },
    setSessionUploadTotalAssets: (state, action: PayloadAction<number>) => {
      state.sessionTotalAssets = action.payload;
      state.sessionUploadedAssets = 0;
    },
    incrementSessionUploadedAssets: (state) => {
      state.sessionUploadedAssets += 1;
    },
  },
});

export const photosActions = photosSlice.actions;
export default photosSlice.reducer;
