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
import { deviceStorage } from '../../../services/asyncStorage';
import {
  GalleryViewMode,
  PhotosSyncStatus,
  PhotosSyncStatusData,
  PhotosSyncInfo,
  PhotosSyncTaskType,
  PhotosByMonthType,
  PhotosTaskCompletedInfo,
} from '../../../types/photos';
import { layoutActions } from '../layout';
import { pathToUri } from '../../../services/fileSystem';

let photosService: PhotosService;

export interface PhotosState {
  isInitialized: boolean;
  isDeviceSynchronized: boolean;
  initializeError: string | null;
  permissions: {
    android: { [key in AndroidPermission]?: PermissionStatus };
    ios: { [key in IOSPermission]?: PermissionStatus };
  };
  syncRequests: string[];
  syncStatus: PhotosSyncStatusData;
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  loadPhotosRequests: string[];
  downloadingPhotos: { id: string; progress: number }[];
  downloadedPhotos: { fileId: string; path: string }[];
  years: { year: number; preview: string }[];
  months: { year: number; month: number; preview: string }[];
  photos: { data: Photo; preview: string }[];
  photosByMonth: PhotosByMonthType[];
  limit: number;
  skip: number;
  selectedPhotos: Photo[];
  usage: number;
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
  syncRequests: [],
  syncStatus: {
    status: PhotosSyncStatus.Unknown,
    completedTasks: 0,
    totalTasks: 0,
  },
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.Days,
  loadPhotosRequests: [],
  downloadingPhotos: [],
  downloadedPhotos: [],
  years: [],
  months: [],
  photosByMonth: [],
  photos: [],
  limit: 60,
  skip: 0,
  selectedPhotos: [],
  usage: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (payload, { dispatch }) => {
    const photosToken = await deviceStorage.getItem('photosToken');
    const user = await deviceStorage.getUser();

    photosService = new PhotosService(photosToken || '', {
      encryptionKey: user?.mnemonic || '',
      user: user?.bridgeUser || '',
      password: user?.userId || '',
    });

    if (user && photosToken) {
      dispatch(getUsageThunk());
    }
  },
);

const startUsingPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startUsingPhotos',
  async (payload: void, { dispatch, getState }) => {
    await dispatch(initializeThunk());
    await dispatch(checkPermissionsThunk());

    // TODO: check if this device is synchronized or ask for start using photos

    if (photosSelectors.arePermissionsGranted(getState())) {
      await photosService.initialize();

      dispatch(syncThunk());
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

const getUsageThunk = createAsyncThunk<number, void, { state: RootState }>('photos/getUsage', async () => {
  return photosService.getUsage();
});

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
    };
  },
  { state: RootState; rejectValue: { isAlreadyDownloading: boolean } }
>('photos/downloadPhoto', async ({ fileId, options }, { dispatch, getState, rejectWithValue }) => {
  const photosState = getState().photos;
  const isAlreadyDownloading = photosState.downloadingPhotos.some((p) => p.id === fileId);

  if (isAlreadyDownloading) {
    return rejectWithValue({ isAlreadyDownloading });
  } else {
    dispatch(photosActions.pushDownloadingPhoto(fileId));
  }

  return photosService.downloadPhoto(fileId, {
    toPath: options.toPath,
    downloadProgressCallback: (progress) => {
      dispatch(photosActions.setDownloadingPhotoProgress({ fileId, progress }));
    },
    decryptionProgressCallback: () => undefined,
  });
});

const loadLocalPhotosThunk = createAsyncThunk<
  { data: Photo; preview: string }[],
  { limit?: number; skip?: number } | undefined,
  { state: RootState }
>('photos/loadLocalPhotos', async (payload, { requestId, getState, dispatch }) => {
  const photosState = getState().photos;
  const isAlreadyLoading = photosState.loadPhotosRequests.filter((id) => id !== requestId).length > 0;

  if (isAlreadyLoading) {
    return [];
  }

  const defaultOptions = { limit: photosState.limit, skip: photosState.skip };
  const options: { limit: number; skip: number } = Object.assign({}, defaultOptions, payload || defaultOptions);
  const results = await photosService.getPhotos(options);
  const allPhotosCount = await photosService.countPhotos();
  const newSkip = options.skip + options.limit > allPhotosCount ? allPhotosCount : options.skip + options.limit;

  dispatch(photosActions.addPhotos(results));
  dispatch(photosActions.setSkip(newSkip));

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
  async (payload: void, { requestId, getState, dispatch, signal }) => {
    const onStart = (tasksInfo: PhotosSyncInfo) => {
      if (!signal.aborted) {
        dispatch(
          photosActions.updateSyncStatus({
            status: tasksInfo.totalTasks > 0 ? PhotosSyncStatus.InProgress : PhotosSyncStatus.Completed,
            totalTasks: tasksInfo.totalTasks,
          }),
        );
      }
    };
    const onTaskCompleted = async ({
      photo,
      completedTasks,
      taskType,
      info,
    }: {
      taskType: PhotosSyncTaskType;
      photo: Photo;
      completedTasks: number;
      info: PhotosTaskCompletedInfo;
    }) => {
      if (!signal.aborted) {
        dispatch(photosActions.updateSyncStatus({ completedTasks }));

        if (taskType === PhotosSyncTaskType.Upload) {
          dispatch(getUsageThunk());
        }

        if (photo.status === PhotoStatus.Exists) {
          if (!info.isAlreadyOnTheDevice) {
            dispatch(photosActions.addPhotos([{ data: photo, preview: pathToUri(info.previewPath) }]));
          }
        } else {
          dispatch(photosActions.popPhoto(photo));
        }
      }
    };
    const onStorageLimitReached = () => {
      dispatch(layoutActions.setShowRunOutSpaceModal(true));
    };
    const photosState = getState().photos;
    const isAlreadySyncing = photosState.syncRequests.filter((id) => id !== requestId).length > 0;

    if (isAlreadySyncing) {
      return;
    }

    dispatch(photosActions.resetSyncStatus());

    await photosService.sync({
      id: requestId,
      signal,
      getState,
      onStart,
      onTaskCompleted,
      onStorageLimitReached,
    });
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
    resetSyncStatus(state) {
      Object.assign(state.syncStatus, { status: PhotosSyncStatus.Unknown, totalTasks: 0, completedTasks: 0 });
    },
    pushDownloadingPhoto(state, action: PayloadAction<string>) {
      state.downloadingPhotos.push({ id: action.payload, progress: 0 });
    },
    setDownloadingPhotoProgress(
      state,
      { payload: { fileId, progress } }: PayloadAction<{ fileId: string; progress: number }>,
    ) {
      const downloadStatus = state.downloadingPhotos.find((p) => p.id === fileId);

      if (downloadStatus) {
        downloadStatus.progress = progress;
      }
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
      state.photosByMonth = [];
      state.skip = 0;
      state.selectedPhotos = [];
      state.isSelectionModeActivated = false;
    },
    addPhotos(state, action: PayloadAction<{ data: Photo; preview: string }[]>) {
      for (const photo of action.payload) {
        const index = state.photos.findIndex((p) => p.data.id === photo.data.id);

        if (!~index) {
          const year = photo.data.takenAt.getFullYear();
          const month = photo.data.takenAt.getMonth();
          const day = photo.data.takenAt.getDate();
          const monthItem = state.photosByMonth.find((m) => m.year === year && m.month === month);

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
            state.photosByMonth.push({
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

          state.photos.push(photo);
        }

        state.photosByMonth.forEach((i) => {
          i.days.sort((a, b) => {
            return b.day - a.day;
          });
        });
      }

      state.photos.sort((a, b) => {
        const aTakenAtTime = a.data.takenAt.getTime();
        const bTakenAtTime = b.data.takenAt.getTime();
        let result = 0;

        if (aTakenAtTime === bTakenAtTime) {
          result = b.data.createdAt.getTime() - a.data.createdAt.getTime();
        } else {
          result = bTakenAtTime - aTakenAtTime;
        }

        return result;
      });
    },
    setSkip(state, action: PayloadAction<number>) {
      state.skip = action.payload;
    },
    popPhoto(state, action: PayloadAction<Photo>) {
      state.photos = state.photos.filter((photo) => photo.data.id !== action.payload.id);
    },
    pushDownloadedPhoto(state, action: PayloadAction<{ fileId: string; path: string }>) {
      state.downloadedPhotos.push(action.payload);
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
      .addCase(startUsingPhotosThunk.pending, (state) => {
        state.isInitialized = false;
        state.initializeError = null;
      })
      .addCase(startUsingPhotosThunk.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(startUsingPhotosThunk.rejected, (state, action) => {
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
      .addCase(getUsageThunk.pending, () => undefined)
      .addCase(getUsageThunk.fulfilled, (state, action) => {
        state.usage = action.payload;
      })
      .addCase(getUsageThunk.rejected, () => undefined);

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
      .addCase(downloadPhotoThunk.fulfilled, (state, action) => {
        const index = state.downloadingPhotos.findIndex((p) => p.id === action.meta.arg.fileId);
        state.downloadingPhotos.splice(index, 1);
      })
      .addCase(downloadPhotoThunk.rejected, (state, action) => {
        if (!action.payload || !action.payload.isAlreadyDownloading) {
          const index = state.downloadingPhotos.findIndex((p) => p.id === action.meta.arg.fileId);
          state.downloadingPhotos.splice(index, 1);

          notify({
            type: 'error',
            text: strings.formatString(
              strings.errors.photosFullSizeLoad,
              action.error.message || strings.errors.unknown,
            ) as string,
          });
        }
      });

    builder
      .addCase(loadLocalPhotosThunk.pending, (state, action) => {
        state.loadPhotosRequests.push(action.meta.requestId);
      })
      .addCase(loadLocalPhotosThunk.fulfilled, (state, action) => {
        const index = state.loadPhotosRequests.indexOf(action.meta.requestId);
        state.loadPhotosRequests.splice(index, 1);
      })
      .addCase(loadLocalPhotosThunk.rejected, (state, action) => {
        const index = state.loadPhotosRequests.indexOf(action.meta.requestId);
        state.loadPhotosRequests.splice(index, 1);

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
      .addCase(syncThunk.pending, (state, action) => {
        state.syncRequests.push(action.meta.requestId);
      })
      .addCase(syncThunk.fulfilled, (state, action) => {
        const index = state.syncRequests.indexOf(action.meta.requestId);
        state.syncRequests.splice(index, 1);
        Object.assign(state.syncStatus, { status: PhotosSyncStatus.Completed });
      })
      .addCase(syncThunk.rejected, (state, action) => {
        const index = state.syncRequests.indexOf(action.meta.requestId);
        state.syncRequests.splice(index, 1);
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
  isLoading: (state: RootState): boolean => state.photos.loadPhotosRequests.length > 0,
  isSyncing: (state: RootState): boolean => state.photos.syncRequests.length > 0,
  hasPhotos: (state: RootState): boolean => state.photos.photos.length > 0,
  isPhotoSelected:
    (state: RootState) =>
    (photo: Photo): boolean =>
      state.photos.selectedPhotos.some((i) => i.id === photo.id),
  isPhotoDownloading:
    (state: RootState) =>
    (fileId: string): boolean =>
      state.photos.downloadingPhotos.some((p) => p.id === fileId),
  isPhotoDownloaded:
    (state: RootState) =>
    (fileId: string): boolean =>
      state.photos.downloadedPhotos.some((i) => i.fileId === fileId),
  getDownloadingPhotoProgress:
    (state: RootState) =>
    (fileId: string): number =>
      state.photos.downloadingPhotos.find((p) => p.id === fileId)?.progress || 0,
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
      (t, x) => t || x === RESULTS.BLOCKED || x === RESULTS.LIMITED,
      false,
    );

    return result;
  },
  photosDirectory: (): string => photosService.photosDirectory,
  previewsDirectory: (): string => photosService.previewsDirectory,
  photosByMonth: (state: RootState): PhotosByMonthType[] => {
    const result: PhotosByMonthType[] = [];

    for (const photo of state.photos.photos) {
      const year = photo.data.takenAt.getFullYear();
      const month = photo.data.takenAt.getMonth();
      const day = photo.data.takenAt.getDate();
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
};

export const photosThunks = {
  initializeThunk,
  startUsingPhotosThunk,
  getUsageThunk,
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
