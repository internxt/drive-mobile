import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  checkMultiple,
  requestMultiple,
  AndroidPermission,
  IOSPermission,
  Permission,
  PERMISSIONS,
  PermissionStatus,
  RESULTS,
} from 'react-native-permissions';
import { photos as photosSdkModule } from '@internxt/sdk';
import { Photo } from '@internxt/sdk/dist/photos';
const { Photos } = photosSdkModule;
import { REACT_NATIVE_PHOTOS_API_URL } from '@env';

import { RootState } from '../..';
import { GalleryViewMode } from '../../../types';
import { Platform } from 'react-native';
import sqliteService from '../../../services/sqlite';
import { PhotosService } from '../../../services/photos';

let photosService: PhotosService;

export interface PhotosState {
  isInitialized: boolean;
  isSyncing: boolean;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  photos: Photo[];
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isInitialized: false,
  isSyncing: false,
  permissions: {
    android: {
      [PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE]: RESULTS.DENIED,
      [PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE]: RESULTS.DENIED,
    },
    ios: {
      [PERMISSIONS.IOS.PHOTO_LIBRARY]: RESULTS.DENIED,
    },
  },
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,
  photos: [],
  selectedPhotos: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (payload: void, { dispatch, getState }) => {
    const { photosToken, user } = getState().auth;

    photosService = new PhotosService(photosToken, {
      encryptionKey: user?.mnemonic || '',
      user: user?.bridgeUser || '',
      password: user?.userId || '',
    });

    await dispatch(checkPermissionsThunk());

    if (photosSelectors.arePermissionsGranted(getState())) {
      await dispatch(syncThunk()).unwrap();
    }
  },
);

const checkPermissionsThunk = createAsyncThunk<Record<Permission, PermissionStatus>, void, { state: RootState }>(
  'photos/checkPermissions',
  async (payload: void, { getState }) => {
    const { permissions } = getState().photos;
    const results = await checkMultiple([
      ...Object.keys(permissions[Platform.OS as 'ios' | 'android']),
    ] as Permission[]);

    return results;
  },
);

const askForPermissionsThunk = createAsyncThunk<boolean, void, { state: RootState }>(
  'photos/askForPermissions',
  async (payload: void, { dispatch, getState }) => {
    const { permissions } = getState().photos;
    const results = await requestMultiple([
      ...Object.keys(permissions[Platform.OS as 'ios' | 'android']),
    ] as Permission[]);
    const areGranted = Object.values(results).reduce((t, x) => t || x === 'granted', false);

    await dispatch(checkPermissionsThunk()).unwrap();

    return areGranted;
  },
);

const deletePhotosThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photos }) => {
    for (const photo of photos) {
      await photosService.deletePhoto(photo);
    }
  },
);

const loadLocalPhotosThunk = createAsyncThunk<
  { loadedPhotos: Photo[] },
  { limit: number; offset?: number },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ limit, offset = 0 }) => {
  const photos = await photosService.getPhotos({ limit, offset });

  return { loadedPhotos: photos };
});

const syncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/sync', async () => {
  console.log('TODO: call photosSync.run');
});

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
    },
    selectPhoto(state, action: PayloadAction<Photo>) {
      state.selectedPhotos = [...state.selectedPhotos, action.payload];
    },
    deselectPhoto(state, action: PayloadAction<Photo>) {
      const itemIndex = state.selectedPhotos.findIndex((i) => i.id === action.payload.id);

      state.selectedPhotos.splice(itemIndex, 1);

      state.selectedPhotos = [...state.selectedPhotos];
    },
    selectAll(state) {
      state.selectedPhotos = [...state.photos];
    },
    deselectAll(state) {
      state.selectedPhotos = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state) => {
        state.isInitialized = false;
      })
      .addCase(initializeThunk.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(checkPermissionsThunk.pending, () => undefined)
      .addCase(checkPermissionsThunk.fulfilled, (state, action) => {
        Object.entries(action.payload).forEach(([key, value]) => {
          if (Platform.OS === 'android') {
            state.permissions.android[key as AndroidPermission] = value;
          } else {
            state.permissions.ios[key as IOSPermission] = value;
          }
        });
      })
      .addCase(checkPermissionsThunk.rejected, () => undefined);

    builder
      .addCase(deletePhotosThunk.pending, () => undefined)
      .addCase(deletePhotosThunk.fulfilled, () => undefined)
      .addCase(deletePhotosThunk.rejected, () => undefined);

    builder
      .addCase(loadLocalPhotosThunk.pending, () => undefined)
      .addCase(loadLocalPhotosThunk.fulfilled, (state, action) => {
        state.photos = action.payload.loadedPhotos;
      })
      .addCase(loadLocalPhotosThunk.rejected, () => undefined);

    builder
      .addCase(syncThunk.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(syncThunk.fulfilled, (state) => {
        state.isSyncing = false;
      })
      .addCase(syncThunk.rejected, (state) => {
        state.isSyncing = false;
      });
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  isPhotoSelected:
    (state: RootState) =>
    (photo: Photo): boolean =>
      state.photos.selectedPhotos.some((i) => i.id === photo.id),
  arePermissionsGranted: (state: RootState): boolean => {
    const result = Object.values(state.photos.permissions[Platform.OS as 'ios' | 'android']).reduce(
      (t, x) => t && x === RESULTS.GRANTED,
      true,
    );

    return result;
  },
  arePermissionsBlocked: (state: RootState): boolean => {
    const result = Object.values(state.photos.permissions[Platform.OS as 'ios' | 'android']).reduce(
      (t, x) => t || x === RESULTS.BLOCKED,
      false,
    );

    return result;
  },
};

export const photosThunks = {
  initializeThunk,
  checkPermissionsThunk,
  askForPermissionsThunk,
  deletePhotosThunk,
  loadLocalPhotosThunk,
  syncThunk,
};

export default photosSlice.reducer;
