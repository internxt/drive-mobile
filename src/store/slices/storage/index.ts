import analyticsService, { AnalyticsEventKey } from '@internxt-mobile/services/AnalyticsService';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import storageService from 'src/services/StorageService';
import { RootState } from '../..';
import asyncStorage from '../../../services/AsyncStorageService';
import { driveThunks } from '../drive';

export interface StorageState {
  limit: number;
  totalUsage: number;
}

const initialState: StorageState = {
  limit: 0,
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

    const driveUsage = getState().drive.usage;
    const limit = getState().storage.limit;
    const totalUsage = driveUsage;

    if (limit) {
      const usagePercent = (totalUsage / limit) * 100;
      const eventPayload = {
        limit: limit,
        usage: totalUsage && typeof totalUsage === 'number' ? totalUsage : 0,
        usage_percent: usagePercent && typeof usagePercent === 'number' ? usagePercent : 0,
        drive_usage: driveUsage && typeof driveUsage === 'number' ? driveUsage : 0,
      };
      const userUuid = getState().auth.user?.uuid;

      if (userUuid) {
        await analyticsService.identify(userUuid, eventPayload);
      }

      await analyticsService.track(AnalyticsEventKey.Usage, eventPayload);
    }

    dispatch(storageSlice.actions.setTotalUsage(driveUsage));
  },
);

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
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
  usage: (state: RootState) => state.drive.usage,
  availableStorage: (state: RootState) => {
    return state.storage.limit - state.drive.usage;
  },
  usagePercent: (state: RootState) => Math.round((state.drive.usage / state.storage.limit) * 100),
};

export const storageActions = storageSlice.actions;

export const storageThunks = {
  initializeThunk,
  loadLimitThunk,
  loadStorageUsageThunk,
};

export default storageSlice.reducer;
