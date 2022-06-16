import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { authThunks } from '../auth';
import { driveThunks } from '../drive';
import { photosThunks } from '../photos';
import { referralsThunks } from '../referrals';
import { usersThunks } from '../users';

export interface AppState {
  isInitializing: boolean;
}

const initialState: AppState = {
  isInitializing: true,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initialize',
  async (payload: void, { dispatch }) => {
    dispatch(authThunks.initializeThunk());
    dispatch(driveThunks.initializeThunk());
    dispatch(photosThunks.initializeThunk());
    dispatch(referralsThunks.initializeThunk());
    dispatch(usersThunks.initializeThunk());
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
