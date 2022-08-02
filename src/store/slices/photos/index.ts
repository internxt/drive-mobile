import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AndroidPermission, IOSPermission, PERMISSIONS, PermissionStatus, RESULTS } from 'react-native-permissions';
import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
import * as MediaLibrary from 'expo-media-library';
import { RootState } from '../..';
import { PhotosService } from '../../../services/photos';
import asyncStorage from '../../../services/AsyncStorageService';
import {
  GalleryViewMode,
  PhotosEventKey,
  PhotosSyncStatus,
  PhotosSyncStatusData,
  PhotoWithPreview,
} from '../../../types/photos';

import { AsyncStorageKey } from '../../../types';
import { permissionsThunks } from './thunks/permissions';
import { usageExtraReducers } from './thunks/usage';
import { syncThunks } from './thunks/sync';
import { PhotosCommonServices } from '../../../services/photos/PhotosCommonService';
import PhotosLocalDatabaseService from '../../../services/photos/PhotosLocalDatabaseService';
import PhotosUserService from '../../../services/photos/PhotosUserService';
import { networkThunks } from './thunks/network';
import authService from 'src/services/AuthService';

export interface PhotosState {
  isInitialized: boolean;
  isDeviceSynchronized: boolean;
  initializeError: string | null;
  photos: PhotoWithPreview[];
  totalPhotos?: number;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  syncStatus: PhotosSyncStatusData;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  usage: number;
  selection: Photo[];
  permissionsStatus: MediaLibrary.PermissionStatus;
}

const initialState: PhotosState = {
  isInitialized: false,
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

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>('photos/initialize', async () => {
  const { credentials } = await authService.getAuthCredentials();

  if (credentials) {
    const { photosToken, user } = credentials;
    const photosDb = new PhotosLocalDatabaseService();
    await photosDb.initialize();

    const photosUserService = new PhotosUserService();

    PhotosCommonServices.initialize(photosToken);
    PhotosCommonServices.initializeModel(photosToken, {
      encryptionKey: user.mnemonic,
      user: user.bridgeUser,
      password: user.userId,
    });
    const { user: photosUser, device: photosDevice } = await photosUserService.initialize();
    PhotosCommonServices.model.user = photosUser;
    PhotosCommonServices.model.device = photosDevice;

    PhotosService.initialize();
  }
});

const startUsingPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startUsingPhotos',
  async (_: void, { dispatch }) => {
    await PhotosService.instance.startPhotos();
    await dispatch(syncThunks.startSyncThunk());
    dispatch(photosActions.setIsInitialized());
  },
);

export const sortPhotos = (photos: PhotoWithPreview[]) => {
  return photos.sort((p1, p2) => {
    const p1TakenAt = new Date(p1.takenAt);
    const p2TakenAt = new Date(p2.takenAt);

    return p1TakenAt.getTime() > p2TakenAt.getTime() ? -1 : 1;
  });
};
type LoadPhotosParams = {
  page: number;
};
const loadPhotosThunk = createAsyncThunk<void, LoadPhotosParams, { state: RootState }>(
  'photos/loadPhotos',
  async (payload: LoadPhotosParams, { dispatch }) => {
    const LIMIT = 50;
    const { results, count } = await PhotosService.instance.getPhotos({
      limit: LIMIT,
      skip: (payload.page - 1) * LIMIT,
    });

    dispatch(photosSlice.actions.setTotalPhotos(count));
    // Get the previews
    const photosWithPreviews = await Promise.all(
      results.map<Promise<PhotoWithPreview>>(async (photo) => {
        return {
          ...photo,
          resolvedPreview: await PhotosService.instance.getPreview(photo),
        };
      }),
    );
    dispatch(photosSlice.actions.savePhotos(photosWithPreviews));
  },
);

const clearPhotosThunk = createAsyncThunk<void, void, { state: RootState }>('photos/clearPhotos', async () => {
  const photosDbService = new PhotosLocalDatabaseService();
  await PhotosService.clearData();
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

    resetPhotos(state) {
      state.selection = [];
      state.isSelectionModeActivated = false;
    },

    insertUploadedPhoto(state, action: PayloadAction<PhotoWithPreview>) {
      if (!state.photos.find((statePhoto) => statePhoto.id === action.payload.id)) {
        state.photos = sortPhotos([...state.photos, action.payload]);
      }
    },

    setTotalPhotos(state, action: PayloadAction<number>) {
      state.totalPhotos = action.payload;
    },

    removePhotos(state, action: PayloadAction<Photo[]>) {
      const toRemove = action.payload.map((photo) => photo.id);

      state.photos = state.photos.filter((photo) => {
        return !toRemove.includes(photo.id);
      });
    },

    savePhotos(state, action: PayloadAction<PhotoWithPreview[]>) {
      state.photos = sortPhotos(
        state.photos.concat(action.payload.filter((photo) => photo.status === PhotoStatus.Exists)),
      );
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
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
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
    (photos: Photo[]): boolean =>
      photos.reduce<boolean>((t, x) => t && photosSelectors.isPhotoSelected(state)(x), true),
  isPhotoSelected: (state: RootState) => (photo: Photo) =>
    !!state.photos.selection.find((selectedPhoto) => selectedPhoto.id === photo.id),
  getPhotosSorted: (state: RootState) => {
    return state.photos.photos;
  },
};

export const photosThunks = {
  initializeThunk,
  startUsingPhotosThunk,
  loadPhotosThunk,
  clearPhotosThunk,
  ...permissionsThunks,
  ...syncThunks,
  ...networkThunks,
};

export default photosSlice.reducer;
