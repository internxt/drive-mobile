import analyticsService, { AnalyticsEventKey } from '@internxt-mobile/services/AnalyticsService';
import photos from '@internxt-mobile/services/photos';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import storageService from 'src/services/StorageService';
import { RootState } from '../..';
import asyncStorage from '../../../services/AsyncStorageService';
import { driveThunks } from '../drive';

export interface ReferralsState {
  limit: number;
  // Store this here, photos doesn't use Redux anymore
  photosUsage: number;
  totalUsage: number;
}

const initialState: ReferralsState = {
  limit: 0,
  photosUsage: 0,
  totalUsage: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/initialize',
  async (payload, { dispatch }) => {
    const user = await asyncStorage.getUser();

    if (user) {
      dispatch(loadLimitThunk());
      dispatch(loadStorageUsageThunk());
    }
  },
);

const loadLimitThunk = createAsyncThunk<number, void, { state: RootState }>('storage/loadLimit', async () => {
  return storageService.loadLimit();
});

const loadStorageUsageThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/loadUsage',
  async (_, { dispatch, getState }) => {
    await dispatch(driveThunks.loadUsageThunk()).unwrap();
    let photosUsage = 0;

    try {
      photosUsage = await photos.usage.getUsage();
    } catch (error) {
      // Noop, if this fails, the photos usage will be 0
    }

    const driveUsage = getState().drive.usage;
    const limit = getState().storage.limit;
    const totalUsage = photosUsage + driveUsage;

    if (limit) {
      const usagePercent = (totalUsage / limit) * 100;
      const eventPayload = {
        limit: limit,
        usage: totalUsage && typeof totalUsage === 'number' ? totalUsage : 0,
        usage_percent: usagePercent && typeof usagePercent === 'number' ? usagePercent : 0,
        drive_usage: driveUsage && typeof driveUsage === 'number' ? driveUsage : 0,
        photos_usage: photosUsage && typeof photosUsage === 'number' ? photosUsage : 0,
      };
      const userUuid = getState().auth.user?.uuid;

      if (userUuid) {
        await analyticsService.identify(userUuid, eventPayload);
      }

      await analyticsService.track(AnalyticsEventKey.Usage, eventPayload);
    }

    dispatch(storageSlice.actions.setTotalUsage(driveUsage + photosUsage));
    dispatch(storageSlice.actions.setPhotosUsage(photosUsage));
  },
);

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setPhotosUsage(state, action: PayloadAction<number>) {
      state.photosUsage = action.payload;
    },
    setTotalUsage(state, action: PayloadAction<number>) {
      state.totalUsage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadLimitThunk.fulfilled, (state, action) => {
      state.limit = action.payload;
    });
  },
});

export const storageSelectors = {
  usage: (state: RootState) => state.drive.usage + state.storage.photosUsage,
  availableStorage: (state: RootState) => {
    return state.storage.limit - state.storage.photosUsage - state.drive.usage;
  },
  usagePercent: (state: RootState) =>
    Math.round(((state.drive.usage + state.storage.photosUsage) / state.storage.limit) * 100),
};

export const storageActions = storageSlice.actions;

export const storageThunks = {
  initializeThunk,
  loadLimitThunk,
  loadStorageUsageThunk,
};

export default storageSlice.reducer;
