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
    const photosUsage = await photos.usage.getUsage();

    const driveUsage = getState().drive.usage;
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
