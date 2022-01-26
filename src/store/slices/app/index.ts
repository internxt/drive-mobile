import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { storageThunks } from '../storage';
import { photosThunks } from '../photos';

export interface AppState {
  isInitializing: boolean;
}

const initialState: AppState = {
  isInitializing: true,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initialize',
  async (payload: void, { dispatch }) => {
    dispatch(storageThunks.initializeThunk());
    dispatch(photosThunks.initializeThunk());
  },
);

export const appSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(initializeThunk.fulfilled, (state) => {
        state.isInitializing = false;
      })
      .addCase(initializeThunk.rejected, (state) => {
        state.isInitializing = false;
      });
  },
});

export const appActions = appSlice.actions;

export const appThunks = {
  initializeThunk,
};

export default appSlice.reducer;
