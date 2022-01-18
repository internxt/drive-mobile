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
import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';

import { RootState } from '../..';
import { Platform } from 'react-native';
import { PhotosService } from '../../../services/photos';
import { notify } from '../../../services/toast';
import strings from '../../../../assets/lang/strings';
import { deviceStorage } from '../../../services/deviceStorage';
import {
  GalleryViewMode,
  PhotosDateRecord,
  PhotosSyncStatus,
  PhotosSyncTasksInfo,
  PhotosSyncTaskType,
} from '../../../types/photos';

let photosService: PhotosService;

export interface PhotosState {
  isInitialized: boolean;
  initializeError: string | null;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  isSyncing: boolean;
  syncStatus: PhotosSyncStatus;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  allPhotosCount: number;
  years: { year: number; preview: string }[];
  months: { year: number; month: number; preview: string }[];
  photos: { data: Photo; preview: string }[];
  limit: number;
  offset: number;
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isInitialized: false,
  initializeError: null,
  permissions: {
    android: {
      [PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE]: RESULTS.DENIED,
      [PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE]: RESULTS.DENIED,
    },
    ios: {
      [PERMISSIONS.IOS.PHOTO_LIBRARY]: RESULTS.DENIED,
    },
  },
  isSyncing: false,
  syncStatus: {
    completedTasks: 0,
    totalTasks: 0,
  },
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,
  allPhotosCount: 0,
  years: [],
  months: [],
  photos: [],
  limit: 25,
  offset: 0,
  selectedPhotos: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (payload: void, { dispatch, getState }) => {
    const { isSyncing } = getState().photos;
    const photosToken = await deviceStorage.getItem('photosToken');
    const user = await deviceStorage.getUser();

    photosService = new PhotosService(photosToken || '', {
      encryptionKey: user?.mnemonic || '',
      user: user?.bridgeUser || '',
      password: user?.userId || '',
    });

    await dispatch(checkPermissionsThunk());

    if (photosSelectors.arePermissionsGranted(getState())) {
      await photosService.initialize();

      dispatch(photosActions.setAllPhotosCount(await photosService.countPhotos()));

      if (!isSyncing) {
        dispatch(syncThunk());
      }
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
  async ({ photos }, { dispatch }) => {
    for (const photo of photos) {
      await photosService.deletePhoto(photo);

      dispatch(photosActions.deselectPhotos(photo));
      dispatch(photosActions.popPhoto(photo));
    }

    dispatch(photosActions.deselectAll());
    dispatch(photosActions.setIsSelectionModeActivated(false));
  },
);

const downloadPhotoThunk = createAsyncThunk<
  string,
  {
    fileId: string;
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    };
  },
  { state: RootState }
>('photos/downloadPhoto', async ({ fileId, options }) => {
  return photosService.downloadPhoto(fileId, options);
});

const loadLocalPhotosThunk = createAsyncThunk<
  { data: Photo; preview: string }[],
  { limit: number; skip?: number },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ limit, skip = 0 }, { dispatch }) => {
  const results = await photosService.getPhotos({ limit, skip });

  dispatch(photosActions.setPhotos(results));

  return results;
});

const loadYearsThunk = createAsyncThunk<{ year: number; preview: string }[], void, { state: RootState }>(
  'photos/loadYears',
  () => {
    return photosService.getYearsList();
  },
);

const loadMonthsThunk = createAsyncThunk<
  { year: number; month: number; preview: string }[],
  void,
  { state: RootState }
>('photos/loadMonths', () => {
  return photosService.getMonthsList();
});

const syncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/sync',
  async (payload: void, { dispatch }) => {
    const onStart = (tasksInfo: PhotosSyncTasksInfo) => {
      dispatch(photosActions.updateSyncStatus({ totalTasks: tasksInfo.totalTasks }));
    };
    const onTaskCompleted = async ({
      photo,
      completedTasks,
    }: {
      taskType: PhotosSyncTaskType;
      photo: Photo;
      completedTasks: number;
    }) => {
      dispatch(photosActions.updateSyncStatus({ completedTasks }));

      if (photo.status === PhotoStatus.Exists) {
        const preview = (await photosService.getPhotoPreview(photo.id)) || '';
        dispatch(photosActions.pushPhoto({ data: photo, preview }));
      } else {
        dispatch(photosActions.popPhoto(photo));
      }
    };

    await photosService.sync({ onStart, onTaskCompleted });
  },
);

const selectAllThunk = createAsyncThunk<Photo[], void, { state: RootState }>('photos/selectAll', async () => {
  return photosService.getAll();
});

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    updateSyncStatus(state, action: PayloadAction<Partial<PhotosSyncStatus>>) {
      Object.assign(state.syncStatus, action.payload);
    },
    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
    },
    setPhotos(state, action: PayloadAction<{ data: Photo; preview: string }[]>) {
      state.photos = action.payload;
    },
    pushPhoto(state, action: PayloadAction<{ data: Photo; preview: string }>) {
      let photos = state.photos.filter((photo) => photo.data.id !== action.payload.data.id);
      photos = [...photos, action.payload];
      photos.sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime());

      state.photos = photos;
    },
    popPhoto(state, action: PayloadAction<Photo>) {
      state.photos = state.photos.filter((photo) => photo.data.id !== action.payload.id);
    },
    setAllPhotosCount(state, action: PayloadAction<number>) {
      state.allPhotosCount = action.payload;
    },
    selectPhotos(state, action: PayloadAction<Photo | Photo[]>) {
      const photosToSelect = Array.isArray(action.payload) ? action.payload : [action.payload];

      state.selectedPhotos = [...state.selectedPhotos, ...photosToSelect];
    },
    deselectPhotos(state, action: PayloadAction<Photo | Photo[]>) {
      const photosToDeselect = Array.isArray(action.payload) ? action.payload : [action.payload];

      for (const photo of photosToDeselect) {
        const itemIndex = state.selectedPhotos.findIndex((i) => i.id === photo.id);

        state.selectedPhotos.splice(itemIndex, 1);

        state.selectedPhotos = [...state.selectedPhotos];
      }
    },
    deselectAll(state) {
      state.selectedPhotos = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state) => {
        state.isInitialized = false;
        state.initializeError = null;
      })
      .addCase(initializeThunk.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(initializeThunk.rejected, (state, action) => {
        state.initializeError = action.error.message || strings.errors.unknown;

        notify({
          type: 'error',
          text: strings.formatString(strings.errors.photosInitialize, state.initializeError) as string,
        });
      });

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
      .addCase(selectAllThunk.pending, () => undefined)
      .addCase(selectAllThunk.fulfilled, (state, action) => {
        state.selectedPhotos = action.payload;
      })
      .addCase(selectAllThunk.rejected, () => undefined);

    builder
      .addCase(deletePhotosThunk.pending, () => undefined)
      .addCase(deletePhotosThunk.fulfilled, () => undefined)
      .addCase(deletePhotosThunk.rejected, (state, action) => {
        notify({
          type: 'error',
          text: strings.formatString(
            strings.errors.photosDelete,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });

    builder
      .addCase(downloadPhotoThunk.pending, () => undefined)
      .addCase(downloadPhotoThunk.fulfilled, () => undefined)
      .addCase(downloadPhotoThunk.rejected, (state, action) => {
        notify({
          type: 'error',
          text: strings.formatString(
            strings.errors.photosFullSizeLoad,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });

    builder
      .addCase(loadLocalPhotosThunk.pending, () => undefined)
      .addCase(loadLocalPhotosThunk.fulfilled, () => undefined)
      .addCase(loadLocalPhotosThunk.rejected, (state, action) => {
        notify({
          type: 'error',
          text: strings.formatString(
            strings.errors.photosLoad,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });

    builder
      .addCase(loadYearsThunk.pending, () => undefined)
      .addCase(loadYearsThunk.fulfilled, (state, action) => {
        state.years = action.payload;
      })
      .addCase(loadYearsThunk.rejected, () => undefined);

    builder
      .addCase(loadMonthsThunk.pending, () => undefined)
      .addCase(loadMonthsThunk.fulfilled, (state, action) => {
        state.months = action.payload;
      })
      .addCase(loadMonthsThunk.rejected, () => undefined);

    builder
      .addCase(syncThunk.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(syncThunk.fulfilled, (state) => {
        state.isSyncing = false;

        notify({
          type: 'success',
          text: strings.messages.photosSyncCompleted,
        });
      })
      .addCase(syncThunk.rejected, (state, action) => {
        state.isSyncing = false;

        notify({
          type: 'error',
          text: strings.formatString(
            strings.errors.photosSync,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  hasPhotos: (state: RootState): boolean => state.photos.allPhotosCount > 0,
  isPhotoSelected:
    (state: RootState) =>
    (photo: Photo): boolean =>
      state.photos.selectedPhotos.some((i) => i.id === photo.id),
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
      (t, x) => t || x === RESULTS.BLOCKED,
      false,
    );

    return result;
  },
  photosDateRecord: (state: RootState): PhotosDateRecord => {
    const result: PhotosDateRecord = {};

    for (const photo of state.photos.photos) {
      const year = photo.data.createdAt.getUTCFullYear();
      const month = photo.data.createdAt.getUTCMonth();
      const day = photo.data.createdAt.getUTCDay();
      const yearItem = result[year];

      if (yearItem) {
        const monthItem = yearItem[month];

        if (monthItem) {
          const dayItem = monthItem[day];

          if (dayItem) {
            monthItem[day].push(photo);
          } else {
            monthItem[day] = [photo];
          }
        } else {
          yearItem[month] = { [day]: [photo] };
        }
      } else {
        result[year] = { [month]: { [day]: [photo] } };
      }
    }

    return result;
  },
};

export const photosThunks = {
  initializeThunk,
  checkPermissionsThunk,
  askForPermissionsThunk,
  selectAllThunk,
  deletePhotosThunk,
  downloadPhotoThunk,
  loadYearsThunk,
  loadMonthsThunk,
  loadLocalPhotosThunk,
  syncThunk,
};

export default photosSlice.reducer;
