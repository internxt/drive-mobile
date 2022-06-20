import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AndroidPermission, IOSPermission, PERMISSIONS, PermissionStatus, RESULTS } from 'react-native-permissions';
import { Photo } from '@internxt/sdk/dist/photos';

import { RootState } from '../..';
import { Platform } from 'react-native';
import { PhotosService } from '../../../services/photos';
import asyncStorage from '../../../services/AsyncStorageService';
import { GalleryViewMode, PhotosEventKey, PhotosSyncStatus, PhotosSyncStatusData } from '../../../types/photos';

import { AsyncStorageKey } from '../../../types';
import { permissionsExtraReducers, permissionsThunks } from './thunks/permissions';
import { usageExtraReducers } from './thunks/usage';
import { syncExtraReducers, syncThunks } from './thunks/sync';
import { PhotosCommonServices } from '../../../services/photos/PhotosCommonService';
import { viewThunks } from './thunks/view';
import { networkThunks } from './thunks/network';
import PhotosLocalDatabaseService from '../../../services/photos/PhotosLocalDatabaseService';

export interface PhotosState {
  isInitialized: boolean;
  isDeviceSynchronized: boolean;
  initializeError: string | null;
  photos: Photo[];
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  syncStatus: PhotosSyncStatusData;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  usage: number;
  selection: Photo[];
}

const initialState: PhotosState = {
  isInitialized: false,
  isDeviceSynchronized: false,
  initializeError: null,
  selection: [],
  photos: [],
  permissions: {
    android: {
      [PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE]: RESULTS.DENIED,
      [PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE]: RESULTS.DENIED,
    },
    ios: {
      [PERMISSIONS.IOS.PHOTO_LIBRARY]: RESULTS.DENIED,
    },
  },

  syncStatus: {
    status: PhotosSyncStatus.Unknown,
    completedTasks: 0,
    totalTasks: 0,
  },
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,

  usage: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>('photos/initialize', async () => {
  const photosToken = await asyncStorage.getItem(AsyncStorageKey.PhotosToken);
  const user = await asyncStorage.getUser();

  PhotosCommonServices.initialize(photosToken || '', {
    encryptionKey: user?.mnemonic || '',
    user: user?.bridgeUser || '',
    password: user?.userId || '',
  });

  PhotosService.initialize();
});

const startUsingPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startUsingPhotos',
  async (payload: void, { dispatch, getState }) => {
    if (!getState().photos.isInitialized) {
      await dispatch(permissionsThunks.checkPermissionsThunk());
      await PhotosService.instance.startPhotos();
      await dispatch(syncThunks.startSyncThunk());
      //PhotosService.instance.setSyncAbort(() => syncThunk.abort());
      dispatch(photosSlice.actions.setIsInitialized());
    }
  },
);

type LoadPhotosParams = {
  page: number;
};
const loadPhotosThunk = createAsyncThunk<void, LoadPhotosParams, { state: RootState }>(
  'photos/loadPhotos',
  async (payload: LoadPhotosParams, { dispatch }) => {
    const photos = await PhotosService.instance.getPhotos({ limit: 50, skip: (payload.page - 1) * 50 });
    console.log('PHOTOS LOADED', photos);
    dispatch(photosSlice.actions.savePhotos(photos));
  },
);

const clearPhotosThunk = createAsyncThunk<void, void, { state: RootState }>('photos/clearPhotos', async () => {
  const photosDbService = new PhotosLocalDatabaseService();
  await PhotosService.instance.clearData();
  await photosDbService.clear();
  PhotosCommonServices.events.emit({
    event: PhotosEventKey.ClearSync,
  });
});

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setIsInitialized(state) {
      state.isInitialized = true;
    },

    updateSyncStatus(state, action: PayloadAction<Partial<PhotosSyncStatusData>>) {
      Object.assign(state.syncStatus, action.payload);
    },

    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },

    resetPhotos(state) {
      state.selection = [];
      state.isSelectionModeActivated = false;
    },

    savePhotos(state, action: PayloadAction<Photo[]>) {
      state.photos = action.payload;
    },

    selectPhotos(state, action: PayloadAction<Photo[]>) {
      state.selection = [...state.selection, ...action.payload];
    },
    deselectPhotos(state, action: PayloadAction<Photo[]>) {
      const photosToDeselect = action.payload;

      for (const photoToDeselect of photosToDeselect) {
        const itemIndex = state.selection.findIndex((photo) => photo.id === photoToDeselect.id);
        state.selection.splice(itemIndex, 1);
        state.selection = [...state.selection];
      }
    },
    deselectAll(state) {
      state.selection = [];
    },
  },
  extraReducers: (builder) => {
    permissionsExtraReducers(builder);
    usageExtraReducers(builder);
    syncExtraReducers(builder);
    /* builder
      .addCase(startUsingPhotosThunk.pending, (state) => {
        state.isInitialized = false;
        state.initializeError = null;
      })
      .addCase(startUsingPhotosThunk.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(startUsingPhotosThunk.rejected, (state, action) => {
        state.initializeError = action.error.message || strings.errors.unknown;

        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(strings.errors.photosInitialize, state.initializeError) as string,
        });
      }); */
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  isInitialized: (state: RootState): boolean => state.photos.isInitialized,
  isSyncing: (state: RootState): boolean => state.photos.syncStatus.status === PhotosSyncStatus.InProgress,
  hasPhotos: (state: RootState): boolean => Object.keys(state.photos.photos).length > 0,
  getSyncStatus: (state: RootState): PhotosSyncStatusData => state.photos.syncStatus,

  isPhotoSelected: (state: RootState) => (photo: Photo) =>
    !!state.photos.selection.find((selectedPhoto) => selectedPhoto.id === photo.id),
  arePhotosSelected:
    (state: RootState) =>
    (photos: Photo[]): boolean =>
      photos.reduce<boolean>((t, x) => t && photosSelectors.isPhotoSelected(state)(x), true),
  arePermissionsGranted: (state: RootState): boolean => {
    const result = Object.values(state.photos.permissions[Platform.OS as 'ios' | 'android']).reduce(
      (t, x) => t && x === RESULTS.GRANTED,
      true,
    );

    return result;
  },
  arePermissionsBlocked: (state: RootState): boolean => {
    const result = Object.values(state.photos.permissions[Platform.OS as 'ios' | 'android']).reduce(
      (t, x) => t || x === RESULTS.BLOCKED || x === RESULTS.LIMITED,
      false,
    );

    return result;
  },
};

export const photosThunks = {
  initializeThunk,
  startUsingPhotosThunk,
  loadPhotosThunk,
  clearPhotosThunk,
  ...permissionsThunks,
  ...viewThunks,
  ...syncThunks,
  ...networkThunks,
};

export default photosSlice.reducer;
