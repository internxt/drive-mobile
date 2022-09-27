import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import storageService from 'src/services/StorageService';
import { RootState } from '../..';
import asyncStorage from '../../../services/AsyncStorageService';
import { driveThunks } from '../drive';
import { photosThunks } from '../photos';

export interface ReferralsState {
  limit: number;
}

const initialState: ReferralsState = {
  limit: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/initialize',
  async (payload, { dispatch }) => {
    const user = await asyncStorage.getUser();

    if (user) {
      dispatch(loadLimitThunk());
    }
  },
);

const loadUsedStorageThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/loadUsedStorage',
  async (payload, { dispatch }) => {
    dispatch(photosThunks.loadPhotosUsageThunk());
    dispatch(driveThunks.loadUsageThunk());
  },
);

const loadLimitThunk = createAsyncThunk<number, void, { state: RootState }>('storage/loadLimit', async () => {
  return storageService.loadLimit();
});

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadLimitThunk.fulfilled, (state, action) => {
      state.limit = action.payload;
    });
  },
});

export const storageSelectors = {
  usage: (state: RootState) => state.drive.usage + state.photos.usage,
  availableStorage: (state: RootState) => state.storage.limit - state.photos.usage - state.drive.usage,
  usagePercent: (state: RootState) =>
    Math.round(((state.drive.usage + state.photos.usage) / state.storage.limit) * 100),
};

export const storageActions = storageSlice.actions;

export const storageThunks = {
  initializeThunk,
  loadLimitThunk,
  loadUsedStorageThunk,
};

export default storageSlice.reducer;
