import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { biometrics } from '@internxt-mobile/services/common';

import drive from '@internxt-mobile/services/drive';
import { BiometricAccessType } from '@internxt-mobile/types/app';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import languageService from 'src/services/LanguageService';
import notificationsService from 'src/services/NotificationsService';
import { Language, NotificationType } from 'src/types';
import { RootState } from '../..';
import { authThunks } from '../auth';
import { driveThunks } from '../drive';
import { paymentsThunks } from '../payments';
import { storageThunks } from '../storage';

export interface AppState {
  isInitializing: boolean;
  deviceHasBiometricAccess: boolean;
  biometricAccessType: BiometricAccessType | null;
  screenLockEnabled: boolean;
  screenLocked: boolean;
  lastScreenLock: number | null;
  initialScreenLocked: boolean;
}

const initialState: AppState = {
  isInitializing: true,
  deviceHasBiometricAccess: false,
  biometricAccessType: null,
  screenLockEnabled: false,
  screenLocked: false,
  lastScreenLock: null,
  initialScreenLocked: false,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initialize',
  async (_, { dispatch }) => {
    await drive.start();

    dispatch(authThunks.initializeThunk());
    dispatch(driveThunks.initializeThunk());
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

const initializeUserPreferencesThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initializeUserPreferences',
  async (_, { dispatch }) => {
    dispatch(appActions.setDeviceHasBiometricAccess(await biometrics.canUseBiometricAccess()));
    dispatch(appActions.setBiometricAccessType(await biometrics.getBiometricAccessType()));
    const screenLockEnabled = await asyncStorageService.getScreenLockIsEnabled();
    const lastScreenLock = await asyncStorageService.getLastScreenUnlock();
    dispatch(appActions.setLastScreenLock(lastScreenLock ? lastScreenLock.getTime() : null));
    dispatch(appActions.setScreenLockIsEnabled(screenLockEnabled));
    dispatch(appActions.setScreenLocked(screenLockEnabled));
    if (screenLockEnabled) {
      dispatch(appActions.setInitialScreenLocked(true));
    }
  },
);

const lockScreenIfNeededThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/lockScreenIfNeeded',
  async (_, { dispatch, getState }) => {
    const { screenLockEnabled, screenLocked } = getState().app;

    if (screenLockEnabled && !screenLocked) {
      const lastScreenUnlock = await asyncStorageService.getLastScreenUnlock();

      if (!lastScreenUnlock) return;
      dispatch(appActions.setLastScreenLock(lastScreenUnlock.getTime()));
      const diff = Date.now() - lastScreenUnlock.getTime();

      if (diff > 1000) {
        dispatch(appActions.setScreenLocked(true));
      }
    }
  },
);

export const appSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setDeviceHasBiometricAccess(state, action: PayloadAction<boolean>) {
      state.deviceHasBiometricAccess = action.payload;
    },
    setBiometricAccessType(state, action: PayloadAction<BiometricAccessType | null>) {
      state.biometricAccessType = action.payload;
    },
    setScreenLockIsEnabled(state, action: PayloadAction<boolean>) {
      state.screenLockEnabled = action.payload;
    },
    setScreenLocked(state, action: PayloadAction<boolean>) {
      state.screenLocked = action.payload;
    },
    setLastScreenLock(state, action: PayloadAction<number | null>) {
      state.lastScreenLock = action.payload;
    },
    setInitialScreenLocked(state, action: PayloadAction<boolean>) {
      state.initialScreenLocked = action.payload;
    },
  },
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
  initializeUserPreferencesThunk,
  lockScreenIfNeededThunk,
};

export default appSlice.reducer;
