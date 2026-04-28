import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { PhotoDeduplicator } from 'src/services/photos/PhotoDeduplicator';
import { PhotoDeviceId } from 'src/services/photos/PhotoDeviceId';
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
export type PhotoSyncStatus = 'idle' | 'scanning' | 'synced' | 'error';

export interface PhotosState {
  enabled: boolean;
  networkCondition: PhotoNetworkCondition;
  permissionStatus: PhotoPermissionStatus;
  syncStatus: PhotoSyncStatus;
  pendingCount: number;
  totalScannedCount: number;
  deviceId: string | null;
}

const initialState: PhotosState = {
  enabled: false,
  networkCondition: 'wifi-only',
  permissionStatus: 'undetermined',
  syncStatus: 'idle',
  pendingCount: 0,
  totalScannedCount: 0,
  deviceId: null,
};

const persistPhotosSettings = async (state: PhotosState): Promise<void> => {
  await asyncStorageService.saveItem(AsyncStorageKey.PhotosSettings, JSON.stringify(state));
};

export const hydratePhotosStateThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/setState',
  async (_, { dispatch }) => {
    const raw = await asyncStorageService.getItem(AsyncStorageKey.PhotosSettings);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PhotosState>;
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
    dispatch(runDiscoveryThunk());
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
      const assetsToSync = await PhotoDeduplicator.getAssetsToSync(scannedAssets);
      dispatch(
        photosSlice.actions.setDiscoveryResult({
          pendingCount: assetsToSync.length,
          totalScannedCount: scannedAssets.length,
        }),
      );
      dispatch(photosSlice.actions.setSyncStatus('idle'));
      logger.info(`[Discovery] Complete — scanned: ${scannedAssets.length}, pending: ${assetsToSync.length}`);
    } catch (error) {
      logger.error('[Discovery] Failed', { error });
      dispatch(photosSlice.actions.setSyncStatus('error'));
    }
  },
);

export const runBackupCycleThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/runBackupCycle',
  async (_, { getState, dispatch }) => {
    await dispatch(checkPermissionRevocationThunk());
    const { enabled, permissionStatus, deviceId } = getState().photos;
    if (!enabled || !isPermissionActive(permissionStatus)) return;

    if (!deviceId) await dispatch(initDeviceIdThunk());
    await dispatch(runDiscoveryThunk());
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
    setDiscoveryResult: (state, action: PayloadAction<{ pendingCount: number; totalScannedCount: number }>) => {
      state.pendingCount = action.payload.pendingCount;
      state.totalScannedCount = action.payload.totalScannedCount;
    },
  },
});

export const photosActions = photosSlice.actions;
export default photosSlice.reducer;
