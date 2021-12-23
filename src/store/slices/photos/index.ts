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
import { photos } from '@internxt/sdk';
import { Device, Photo } from '@internxt/sdk/dist/photos';
const { Photos } = photos;

import { RootState } from '../..';
import { GalleryViewMode } from '../../../types';
import { Platform } from 'react-native';
import sqliteService from '../../../services/sqlite';
import photo from '../../../services/sqlite/tables/photo';
import photo_source from '../../../services/sqlite/tables/photo_source';
import device from '../../../services/sqlite/tables/device';

const photosSdk = new Photos(process.env.REACT_NATIVE_PHOTOS_API_URL as string);

const SQLITE_DB_NAME = 'photos';

export interface PhotosState {
  isInitialized: boolean;
  isDatabaseInitialized: boolean;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  photos: Photo[];
  nextCursor?: string;
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isInitialized: false,
  isDatabaseInitialized: false,
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
  photos: [
    {
      id: '01',
      name: 'photo-01',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-01',
      previewId: 'previewId-01',
      deviceId: '01',
      userUuid: '01',
      createdAt: '2021-12-23T14:12:47Z',
      updatedAt: '2021-12-23T14:12:47Z',
    },
    {
      id: '02',
      name: 'photo-02',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-02',
      previewId: 'previewId-02',
      deviceId: '02',
      userUuid: '02',
      createdAt: '2021-12-23T14:12:47Z',
      updatedAt: '2021-12-23T14:12:47Z',
    },
    {
      id: '03',
      name: 'photo-03',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-03',
      previewId: 'previewId-03',
      deviceId: '03',
      userUuid: '03',
      createdAt: '2021-12-23T14:12:47Z',
      updatedAt: '2021-12-23T14:12:47Z',
    },
    {
      id: '04',
      name: 'photo-04',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-04',
      previewId: 'previewId-04',
      deviceId: '04',
      userUuid: '04',
      createdAt: '2021-12-23T14:12:47Z',
      updatedAt: '2021-12-23T14:12:47Z',
    },
    {
      id: '05',
      name: 'photo-05',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-05',
      previewId: 'previewId-05',
      deviceId: '05',
      userUuid: '05',
      createdAt: '2021-12-23T14:12:47Z',
      updatedAt: '2021-12-23T14:12:47Z',
    },
  ],
  nextCursor: undefined,
  selectedPhotos: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (payload: void, { dispatch, getState }) => {
    await dispatch(checkPermissionsThunk());

    photosSdk.setAccessToken(getState().auth.token);

    if (photosSelectors.arePermissionsGranted(getState())) {
      await dispatch(initializeDatabaseThunk()).unwrap();
    }
  },
);

const initializeDatabaseThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initializeDatabase',
  async () => {
    await sqliteService.open(SQLITE_DB_NAME);

    await sqliteService.executeSql(SQLITE_DB_NAME, photo.statements.createTable);
    await sqliteService.executeSql(SQLITE_DB_NAME, photo_source.statements.createTable);
    await sqliteService.executeSql(SQLITE_DB_NAME, device.statements.createTable);
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

const createDeviceThunk = createAsyncThunk<void, { device: Device }, { state: RootState }>(
  'photos/createDevice',
  async ({ device }) => {
    await photosSdk.devices.createDevice(device);
  },
);

const createPhotoThunk = createAsyncThunk<void, { data: Photo }, { state: RootState }>(
  'photos/createPhoto',
  async ({ data }) => {
    // TODO: upload photo and preview

    await photosSdk.photos.createPhoto(data);
  },
);

const deletePhotosThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photos }) => {
    for (const photo of photos) {
      await photosSdk.photos.deletePhotoById(photo.id);
    }
  },
);

const loadLocalPhotosThunk = createAsyncThunk<
  { loadedPhotos: Photo[]; nextCursor: string | undefined },
  { cursor?: string },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ cursor }, { getState }) => {
  return { loadedPhotos: getState().photos.photos, nextCursor: cursor };
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
      .addCase(initializeDatabaseThunk.pending, (state) => {
        state.isDatabaseInitialized = false;
      })
      .addCase(initializeDatabaseThunk.fulfilled, (state) => {
        state.isDatabaseInitialized = true;
      })
      .addCase(initializeDatabaseThunk.rejected, () => undefined);

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
      .addCase(createDeviceThunk.pending, () => undefined)
      .addCase(createDeviceThunk.fulfilled, () => undefined)
      .addCase(createDeviceThunk.rejected, () => undefined);

    builder
      .addCase(createPhotoThunk.pending, () => undefined)
      .addCase(createPhotoThunk.fulfilled, () => undefined)
      .addCase(createPhotoThunk.rejected, () => undefined);

    builder
      .addCase(deletePhotosThunk.pending, () => undefined)
      .addCase(deletePhotosThunk.fulfilled, () => undefined)
      .addCase(deletePhotosThunk.rejected, () => undefined);

    builder
      .addCase(loadLocalPhotosThunk.pending, () => undefined)
      .addCase(loadLocalPhotosThunk.fulfilled, (state, action) => {
        state.photos = action.payload.loadedPhotos;
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(loadLocalPhotosThunk.rejected, () => undefined);
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
      (t, x) => t && x === 'granted',
      true,
    );

    return result;
  },
  arePermissionsBlocked: (state: RootState): boolean => {
    const result = Object.values(state.photos.permissions[Platform.OS as 'ios' | 'android']).reduce(
      (t, x) => t || x === 'blocked',
      false,
    );

    return result;
  },
};

export const photosThunks = {
  initializeThunk,
  initializeDatabaseThunk,
  checkPermissionsThunk,
  askForPermissionsThunk,
  createDeviceThunk,
  createPhotoThunk,
  deletePhotosThunk,
  loadLocalPhotosThunk,
};

export default photosSlice.reducer;
