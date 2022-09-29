import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AndroidPermission, IOSPermission, PERMISSIONS, PermissionStatus, RESULTS } from 'react-native-permissions';
import * as MediaLibrary from 'expo-media-library';
import { RootState } from '../..';
import photosService from '../../../services/photos';
import {
  GalleryViewMode,
  PhotosEventKey,
  PhotosItem,
  PhotosSyncStatus,
  PhotosSyncStatusData,
  PhotoSyncStatus,
} from '../../../types/photos';

import { usageExtraReducers } from './thunks/usage';
import { syncThunks } from './thunks/sync';
import { networkThunks } from './thunks/network';
import authService from 'src/services/AuthService';
import photos from '@internxt-mobile/services/photos';
import { PHOTOS_ITEMS_PER_PAGE } from '@internxt-mobile/services/photos/constants';

export interface PhotosState {
  isInitialized: boolean;
  isDeviceSynchronized: boolean;
  initializeError: string | null;
  photos: PhotosItem[];
  syncedPhotos: PhotosItem[];
  totalPhotos?: number;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  nextPhotosCursor?: string;
  syncStatus: PhotosSyncStatusData;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  usage: number;
  selection: PhotosItem[];
  permissionsStatus: MediaLibrary.PermissionStatus;
  currentPage: number;
  isPullingPhotos: boolean;
}

const initialState: PhotosState = {
  isInitialized: false,
  isPullingPhotos: false,
  syncedPhotos: [],
  currentPage: 1,
  isDeviceSynchronized: false,
  initializeError: null,
  selection: [],
  photos: [],
  permissionsStatus: MediaLibrary.PermissionStatus.UNDETERMINED,
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

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (_, { dispatch }) => {
    const { credentials } = await authService.getAuthCredentials();

    if (credentials) {
      await photos.user.init();

      const { hasPermissions } = await dispatch(checkPermissionsThunk()).unwrap();

      if (hasPermissions) {
        dispatch(startUsingPhotosThunk());
      }
    }
  },
);

const startUsingPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startUsingPhotos',
  async (_: void, { dispatch, getState }) => {
    if (!getState().photos.isInitialized) {
      dispatch(photosActions.setIsInitialized(true));
      await photos.start();

      await dispatch(syncThunks.startSyncThunk()).unwrap();
      await dispatch(loadPhotosThunk({})).unwrap();
    }
  },
);

const checkPermissionsThunk = createAsyncThunk<{ hasPermissions: boolean }, void, { state: RootState }>(
  'photos/checkPermissions',
  async (payload: void, { dispatch }) => {
    const permissions = await MediaLibrary.getPermissionsAsync();

    const permissionsGranted = permissions.status === MediaLibrary.PermissionStatus.GRANTED;

    dispatch(photosSlice.actions.setPermissionsStatus(permissions.status));
    return {
      hasPermissions: permissionsGranted,
    };
  },
);

const askForPermissionsThunk = createAsyncThunk<boolean, void, { state: RootState }>(
  'photos/askForPermissions',
  async () => {
    const response = await MediaLibrary.requestPermissionsAsync();
    return response.granted;
  },
);

const loadPhotosUsageThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/loadPhotosUsage',
  async (_, { dispatch }) => {
    dispatch(photosActions.setUsage(await photos.usage.getUsage()));
  },
);

type LoadPhotosParams = {
  nextCursor?: string;
  isRefreshing?: boolean;
};
const loadPhotosThunk = createAsyncThunk<void, LoadPhotosParams, { state: RootState }>(
  'photos/loadPhotos',
  async (payload: LoadPhotosParams = {}, { dispatch, getState }) => {
    const getPhotos = async (cursor?: string) => {
      const { endCursor, assets, hasNextPage } = await photos.sync.getDevicePhotos(cursor, 10000);

      dispatch(
        photosSlice.actions.savePhotos({
          photos: assets,
          options: {
            refresh: payload?.isRefreshing || false,
          },
        }),
      );
      if (hasNextPage) {
        await getPhotos(endCursor);
      } else {
        dispatch(photosActions.setIsPullingPhotos(false));
      }
    };
    if (!getState().photos.syncedPhotos.length || payload.isRefreshing) {
      const syncedPhotosItems = await photos.database.getSyncedPhotos();

      const photosWithPreviews = syncedPhotosItems.map(async ({ photo }) => {
        const item = photos.utils.getPhotosItem(photo);
        const preview = await photos.preview.getPreview(item);
        return {
          ...item,
          localUri: preview as string,
          localPreviewPath: preview as string,
        };
      });

      dispatch(photosSlice.actions.saveSyncedPhotos(await Promise.all(photosWithPreviews)));
    }

    if (!getState().photos.isPullingPhotos) {
      dispatch(photosActions.setIsPullingPhotos(true));
      await getPhotos();
    }
  },
);

const refreshPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/refresh',
  async (_, { dispatch, getState }) => {
    if (!getState().photos.isPullingPhotos) {
      await dispatch(loadPhotosThunk({ isRefreshing: true }));
    }

    await dispatch(syncThunks.restartSyncThunk());
  },
);

const removePhotosThunk = createAsyncThunk<void, { photosToRemove: PhotosItem[] }, { state: RootState }>(
  'photos/remove',
  async (payload, { dispatch }) => {
    const newPhotos = payload.photosToRemove.map((photo) => ({
      ...photo,
      status: PhotoSyncStatus.DELETED,
    }));

    dispatch(
      photosActions.savePhotos({
        photos: newPhotos,
      }),
    );
  },
);

const clearPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/clearPhotos',
  async (_, { dispatch }) => {
    photos.events.emit({
      event: PhotosEventKey.ClearSync,
    });
    await photosService.clear();
    dispatch(photosActions.setIsInitialized(false));
  },
);

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setIsInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },

    setTotalPhotos(state, action: PayloadAction<number>) {
      state.totalPhotos = action.payload;
    },

    setPermissionsStatus: (state, action: PayloadAction<MediaLibrary.PermissionStatus>) => {
      state.permissionsStatus = action.payload;
    },

    updateSyncStatus(state, action: PayloadAction<Partial<PhotosSyncStatusData>>) {
      if (state.syncStatus !== action.payload) {
        state.syncStatus = { ...state.syncStatus, ...action.payload };
      }
    },

    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },
    resetLoadedPhotos(state) {
      state.photos = [];
    },
    resetPhotos(state) {
      state.selection = [];
      state.isSelectionModeActivated = false;
    },

    setNextPhotosCursor(state, action: PayloadAction<string>) {
      state.nextPhotosCursor = action.payload;
    },
    insertUploadedPhoto(state, action: PayloadAction<PhotosItem>) {
      state.photos = photos.utils.mergePhotosItems([...state.syncedPhotos, ...state.photos, action.payload]);
    },
    setIsPullingPhotos(state, action: PayloadAction<boolean>) {
      state.isPullingPhotos = action.payload;
    },

    savePhotos(
      state,
      action: PayloadAction<{
        photos: PhotosItem[];
        options?: { refresh: boolean };
      }>,
    ) {
      state.photos = photos.utils.mergePhotosItems([...state.syncedPhotos, ...state.photos, ...action.payload.photos]);
    },

    saveSyncedPhotos(state, action: PayloadAction<PhotosItem[]>) {
      state.syncedPhotos = action.payload;
    },

    selectPhotos(state, action: PayloadAction<PhotosItem[]>) {
      state.selection = [...state.selection, ...action.payload];
    },
    deselectPhotos(state, action: PayloadAction<PhotosItem[]>) {
      const photosToDeselect = action.payload;

      for (const photoToDeselect of photosToDeselect) {
        const itemIndex = state.selection.findIndex((photo) => photo.name === photoToDeselect.name);
        state.selection.splice(itemIndex, 1);
        state.selection = [...state.selection];
      }
    },
    deselectAll(state) {
      state.selection = [];
    },
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
    },
    getNextPage(state) {
      state.currentPage = state.currentPage + 1;
    },
    setUsage(state, action: PayloadAction<number>) {
      state.usage = action.payload;
    },
  },
  extraReducers: (builder) => {
    usageExtraReducers(builder);
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  isInitialized: (state: RootState): boolean => state.photos.isInitialized,
  isSyncing: (state: RootState): boolean => state.photos.syncStatus.status === PhotosSyncStatus.InProgress,
  hasPhotos: (state: RootState): boolean => Object.keys(state.photos.photos).length > 0,
  getSyncStatus: (state: RootState): PhotosSyncStatusData => state.photos.syncStatus,
  permissionsStatus: (state: RootState): MediaLibrary.PermissionStatus => state.photos.permissionsStatus,
  hasPhotosSelected: (state: RootState): boolean => (state.photos.selection.length ? true : false),
  hasMorePhotos: (state: RootState): boolean =>
    state.photos.totalPhotos ? state.photos.photos.length !== state.photos.totalPhotos : true,
  arePhotosSelected:
    (state: RootState) =>
    (photos: PhotosItem[]): boolean =>
      photos.reduce<boolean>((t, x) => t && photosSelectors.isPhotoSelected(state)(x), true),
  isPhotoSelected: (state: RootState) => (photo: PhotosItem) =>
    !!state.photos.selection.find((selectedPhoto) => selectedPhoto.name === photo.name),
  getPhotosItemByName: (state: RootState) => (name: string) => {
    return state.photos.photos.find((photo) => photo.name === name);
  },
  getPhotosSorted: (state: RootState) => {
    const newItems = PHOTOS_ITEMS_PER_PAGE * state.photos.currentPage;
    return state.photos.photos.slice(0, newItems);
  },
};

export const photosThunks = {
  initializeThunk,
  startUsingPhotosThunk,
  loadPhotosThunk,
  clearPhotosThunk,
  loadPhotosUsageThunk,
  refreshPhotosThunk,
  checkPermissionsThunk,
  askForPermissionsThunk,
  removePhotosThunk,
  ...syncThunks,
  ...networkThunks,
};

export default photosSlice.reducer;
