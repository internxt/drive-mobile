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
  PhotosSyncStatusData,
  PhotosSyncInfo,
  PhotosSyncTaskType,
  PhotosByMonthType,
} from '../../../types/photos';

let photosService: PhotosService;

export interface PhotosState {
  isInitialized: boolean;
  isDeviceSynchronized: boolean;
  initializeError: string | null;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  isSyncing: boolean;
  syncStatus: PhotosSyncStatusData;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  isLoading: boolean;
  years: { year: number; preview: string }[];
  months: { year: number; month: number; preview: string }[];
  photos: { data: Photo; preview: string }[];
  limit: number;
  skip: number;
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isInitialized: false,
  isDeviceSynchronized: false,
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
    status: PhotosSyncStatus.Unknown,
    completedTasks: 0,
    totalTasks: 0,
  },
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.Days,
  isLoading: false,
  years: [],
  months: [],
  photos: [],
  limit: 25,
  skip: 0,
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

    // TODO: check is device synchronized

    if (photosSelectors.arePermissionsGranted(getState())) {
      await photosService.initialize();

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
  { limit?: number; skip?: number } | undefined,
  { state: RootState }
>('photos/loadLocalPhotos', async (payload, { getState, dispatch }) => {
  const photosState = getState().photos;
  const defaultOptions = { limit: photosState.limit, skip: photosState.skip };
  const options: { limit: number; skip: number } = Object.assign({}, defaultOptions, payload || defaultOptions);
  const results = await photosService.getPhotos(options);

  dispatch(photosActions.addPhotos(results));
  dispatch(photosActions.setSkip(options.skip + options.limit));

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
    const onStart = (tasksInfo: PhotosSyncInfo) => {
      dispatch(
        photosActions.updateSyncStatus({
          status: tasksInfo.totalTasks > 0 ? PhotosSyncStatus.InProgress : PhotosSyncStatus.Completed,
          totalTasks: tasksInfo.totalTasks,
        }),
      );
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

const clearDataThunk = createAsyncThunk<void, void, { state: RootState }>('photos/clearData', async () => {
  return photosService.clearData();
});

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    updateSyncStatus(state, action: PayloadAction<Partial<PhotosSyncStatusData>>) {
      Object.assign(state.syncStatus, action.payload);
    },
    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
    },
    resetPhotos(state) {
      state.photos = [];
      state.skip = 0;
      state.selectedPhotos = [];
      state.isSelectionModeActivated = false;
    },
    addPhotos(state, action: PayloadAction<{ data: Photo; preview: string }[]>) {
      state.photos.push(...action.payload);
    },
    setSkip(state, action: PayloadAction<number>) {
      state.skip = action.payload;
    },
    pushPhoto(state, action: PayloadAction<{ data: Photo; preview: string }>) {
      const index = state.photos.findIndex((photo) => photo.data.id === action.payload.data.id);

      if (~index) {
        Object.assign(state.photos[index], action.payload);
      } else {
        state.photos.push(action.payload);
      }
      state.photos.sort((a, b) => b.data.takenAt.getTime() - a.data.takenAt.getTime());
    },
    popPhoto(state, action: PayloadAction<Photo>) {
      state.photos = state.photos.filter((photo) => photo.data.id !== action.payload.id);
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
      .addCase(loadLocalPhotosThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadLocalPhotosThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(loadLocalPhotosThunk.rejected, (state, action) => {
        state.isLoading = false;

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
        Object.assign(state.syncStatus, { status: PhotosSyncStatus.Calculating });
      })
      .addCase(syncThunk.fulfilled, (state) => {
        state.isSyncing = false;
        Object.assign(state.syncStatus, { status: PhotosSyncStatus.Completed });

        notify({
          type: 'success',
          text: strings.messages.photosSyncCompleted,
        });
      })
      .addCase(syncThunk.rejected, (state, action) => {
        state.isSyncing = false;
        Object.assign(state.syncStatus, { status: PhotosSyncStatus.Pending });

        notify({
          type: 'error',
          text: strings.formatString(
            strings.errors.photosSync,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });

    builder
      .addCase(clearDataThunk.pending, () => undefined)
      .addCase(clearDataThunk.fulfilled, () => undefined)
      .addCase(clearDataThunk.rejected, () => undefined);
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  hasPhotos: (state: RootState): boolean => state.photos.photos.length > 0,
  isPhotoSelected:
    (state: RootState) =>
    (photo: Photo): boolean =>
      state.photos.selectedPhotos.some((i) => i.id === photo.id),
  arePhotosSelected:
    (state: RootState) =>
    (photos: Photo[]): boolean =>
      photos.reduce<boolean>((t, x) => t && photosSelectors.isPhotoSelected(state)(x), true),
  getPhotoPreview:
    (state: RootState) =>
    (photo: Photo): string =>
      state.photos.photos.find((p) => p.data.id === photo.id)?.preview || '',
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
  photosByMonth: (state: RootState): PhotosByMonthType[] => {
    const result: PhotosByMonthType[] = [];

    for (const photo of state.photos.photos) {
      const year = photo.data.takenAt.getFullYear();
      const month = photo.data.takenAt.getMonth();
      const day = photo.data.takenAt.getDay();
      const monthItem = result.find((m) => m.year === year && m.month === month);

      if (monthItem) {
        const dayItem = monthItem.days.find((d) => d.day === day);

        if (dayItem) {
          dayItem.photos.push(photo);
        } else {
          monthItem.days.push({
            day,
            photos: [photo],
          });
        }
      } else {
        result.push({
          year,
          month,
          days: [
            {
              day,
              photos: [photo],
            },
          ],
        });
      }
    }

    return result;
  },
  photosDateRecord: (state: RootState): PhotosDateRecord => {
    const result: PhotosDateRecord = {};

    for (const photo of state.photos.photos) {
      const year = photo.data.takenAt.getFullYear();
      const month = photo.data.takenAt.getMonth();
      const day = photo.data.takenAt.getDay();
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
  clearDataThunk,
};

export default photosSlice.reducer;
