import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { biometrics } from '@internxt-mobile/services/common';

import drive from '@internxt-mobile/services/drive';
import { BiometricAccessType } from '@internxt-mobile/types/app';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import * as Localization from 'expo-localization';
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
  language: Language;
}

const initialState: AppState = {
  isInitializing: true,
  deviceHasBiometricAccess: false,
  biometricAccessType: null,
  screenLockEnabled: false,
  screenLocked: false,
  lastScreenLock: null,
  initialScreenLocked: false,
  language: Language.English,
};

const initializeLanguageThunk = createAsyncThunk<Language, void, { state: RootState }>(
  'app/initializeLanguage',
  async () => {
    const savedLanguage = await asyncStorageService.getItem('language' as any);

    if (savedLanguage) {
      strings.setLanguage(savedLanguage);
      return savedLanguage as Language;
    } else {
      const deviceLocale = Localization.getLocales()[0]?.languageCode;
      const detectedLanguage = deviceLocale === 'es' ? Language.Spanish : Language.English;
      strings.setLanguage(detectedLanguage);
      await asyncStorageService.saveItem('language' as any, detectedLanguage);
      return detectedLanguage;
    }
  },
);

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'app/initialize',
  async (_, { dispatch }) => {
    await drive.start();

    await dispatch(initializeLanguageThunk()).unwrap();

    dispatch(authThunks.initializeThunk());
    dispatch(driveThunks.initializeThunk());
    dispatch(paymentsThunks.initializeThunk());
    dispatch(storageThunks.initializeThunk());
  },
);

const changeLanguageThunk = createAsyncThunk<Language, Language, { state: RootState }>(
  'app/changeLanguage',
  async (language) => {
    await languageService.setLanguage(language);
    return language;
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
    } else {
      dispatch(appActions.setInitialScreenLocked(false));
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

    builder.addCase(initializeLanguageThunk.fulfilled, (state, action) => {
      state.language = action.payload;
    });

    builder
      .addCase(changeLanguageThunk.fulfilled, (state, action) => {
        state.language = action.payload;
      })
      .addCase(changeLanguageThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.changeLanguage });
      });
  },
});

export const appActions = appSlice.actions;

export const appThunks = {
  initializeThunk,
  initializeLanguageThunk,
  changeLanguageThunk,
  initializeUserPreferencesThunk,
  lockScreenIfNeededThunk,
};

export default appSlice.reducer;
