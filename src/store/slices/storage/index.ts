import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import storageService from 'src/services/StorageService';
import { RootState } from '../..';
import asyncStorage from '../../../services/AsyncStorageService';

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
    Math.floor(((state.drive.usage + state.photos.usage) / state.storage.limit) * 100),
};

export const storageActions = storageSlice.actions;

export const storageThunks = {
  initializeThunk,
  loadLimitThunk,
};

export default storageSlice.reducer;
