import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import { photoPermissionService, PhotoPermissionStatus } from 'src/services/photos/photoPermissionService';
import { AsyncStorageKey } from 'src/types';
import { logger } from '../../../services/common';
import { RootState } from '../../index';

export type PhotoNetworkCondition = 'wifi-only' | 'wifi-and-data';

export interface PhotosState {
  enabled: boolean;
  networkCondition: PhotoNetworkCondition;
  permissionStatus: PhotoPermissionStatus;
}

const initialState: PhotosState = {
  enabled: false,
  networkCondition: 'wifi-only',
  permissionStatus: 'undetermined',
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
  const isGranted = permissionStatus === 'granted' || permissionStatus === 'limited';

  const state = getState().photos;
  const updated: PhotosState = { ...state, enabled: isGranted, permissionStatus };
  dispatch(photosSlice.actions.setState({ enabled: isGranted, permissionStatus }));
  await persistPhotosSettings(updated);

  // TODO: trigger initial gallery scan here

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
  },
});

export const photosActions = photosSlice.actions;
export default photosSlice.reducer;
