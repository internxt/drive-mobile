import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import languageService from 'src/services/LanguageService';
import notificationsService from 'src/services/NotificationsService';
import { Language, NotificationType } from 'src/types';
import { RootState } from '../..';
import { authThunks } from '../auth';
import { driveThunks } from '../drive';
import { paymentsThunks } from '../payments';
import { photosThunks } from '../photos';
import { referralsThunks } from '../referrals';
import { storageThunks } from '../storage';
import { usersThunks } from '../users';

export interface AppState {
  isInitializing: boolean;
}

const initialState: AppState = {
  isInitializing: true,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initialize',
  async (payload, { dispatch }) => {
    dispatch(authThunks.initializeThunk());
    dispatch(driveThunks.initializeThunk());
    dispatch(photosThunks.initializeThunk());
    dispatch(referralsThunks.initializeThunk());
    dispatch(usersThunks.initializeThunk());
    dispatch(paymentsThunks.initializeThunk());
    dispatch(storageThunks.initializeThunk());
  },
);

const changeLanguageThunk = createAsyncThunk<void, Language, { state: RootState }>(
  'app/changeLanguage',
  async (language) => {
    return languageService.setLanguage(language);
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

    builder.addCase(changeLanguageThunk.rejected, () => {
      notificationsService.show({ type: NotificationType.Error, text1: strings.errors.changeLanguage });
    });
  },
});

export const appActions = appSlice.actions;

export const appThunks = {
  initializeThunk,
  changeLanguageThunk,
};

export default appSlice.reducer;
