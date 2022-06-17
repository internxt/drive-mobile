import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import asyncStorageService from '../../../services/AsyncStorageService';
import { RootState } from '../..';
import authService from '../../../services/AuthService';
import userService from '../../../services/UserService';
import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import { AsyncStorageKey, DevicePlatform, NotificationType, User } from '../../../types';
import { photosActions, photosThunks } from '../photos';
import { appThunks } from '../app';
import { driveActions, driveThunks } from '../drive';
import { uiActions } from '../ui';
import notificationsService from '../../../services/NotificationsService';
import strings from '../../../../assets/lang/strings';
import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';

export interface AuthState {
  loggedIn: boolean;
  token: string;
  photosToken: string;
  user?: User;
  userStorage: {
    usage: number;
    limit: number;
    percentage: number;
  };
}

const initialState: AuthState = {
  loggedIn: false,
  token: '',
  photosToken: '',
  user: undefined,
  userStorage: { usage: 0, limit: 0, percentage: 0 },
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/initialize',
  async (payload, { getState }) => {
    const { loggedIn, token, user } = getState().auth;

    if (loggedIn && user) {
      authService.initialize(token, user?.mnemonic);
    }
  },
);

export const silentSignInThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/silentSignIn',
  async (payload, { dispatch }) => {
    const token = await asyncStorageService.getItem(AsyncStorageKey.Token);
    const photosToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
    const user = await asyncStorageService.getUser();

    if (token && photosToken && user) {
      dispatch(authActions.setSignInData({ token, photosToken, user }));

      authService.emitLoginEvent();
    }
  },
);

export const signInThunk = createAsyncThunk<
  { token: string; photosToken: string; user: User },
  { email: string; password: string; sKey: string; twoFactorCode: string },
  { state: RootState }
>('auth/signIn', async (payload, { dispatch }) => {
  const result = await userService.signin(payload.email, payload.password, payload.sKey, payload.twoFactorCode);

  await asyncStorageService.saveItem(AsyncStorageKey.Token, result.token);
  await asyncStorageService.saveItem(AsyncStorageKey.PhotosToken, result.photosToken); // Photos access token
  await asyncStorageService.saveItem(AsyncStorageKey.User, JSON.stringify(result.user));

  dispatch(appThunks.initializeThunk());

  authService.emitLoginEvent();

  return result;
});

export const signOutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/signOut',
  async (payload, { dispatch }) => {
    await authService.signout();

    dispatch(uiActions.resetState());
    dispatch(authActions.resetState());
    dispatch(driveThunks.clearLocalDatabaseThunk());
    dispatch(driveActions.resetState());
    dispatch(photosThunks.cancelSyncThunk());
    dispatch(photosThunks.clearLocalDatabaseThunk());
    dispatch(photosActions.resetState());

    authService.emitLogoutEvent();
  },
);

export const deleteAccountThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/deleteAccount',
  async (payload, { getState }) => {
    const { user } = getState().auth;

    user && (await authService.deleteAccount(user.email));
  },
);

export const updateProfileThunk = createAsyncThunk<UpdateProfilePayload, UpdateProfilePayload, { state: RootState }>(
  'auth/updateProfile',
  async (payload) => {
    await userService.updateProfile(payload);

    return payload;
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setSignInData: (state, action: PayloadAction<{ token: string; photosToken: string; user: User }>) => {
      state.loggedIn = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.photosToken = action.payload.photosToken;
    },
    setUserStorage(state, action: PayloadAction<{ usage: number; limit: number; percentage: number }>) {
      state.userStorage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(signInThunk.pending, () => undefined)
      .addCase(signInThunk.fulfilled, (state, action) => {
        const { photosToken, token, user } = action.payload;

        analytics
          .identify(user.uuid, {
            email: user.email,
            platform: DevicePlatform.Mobile,
            referrals_credit: user.credit,
            referrals_count: Math.floor(user.credit / 5),
            createdAt: user.createdAt,
          })
          .then(() => {
            analytics.track(AnalyticsEventKey.UserSignIn, {
              email: user.email,
              userId: user.uuid,
              platform: DevicePlatform.Mobile,
            });
          });

        state.loggedIn = true;
        state.token = token;
        state.photosToken = photosToken;
        state.user = user;
      })
      .addCase(signInThunk.rejected, () => undefined);

    builder
      .addCase(silentSignInThunk.pending, () => undefined)
      .addCase(silentSignInThunk.fulfilled, () => undefined)
      .addCase(silentSignInThunk.rejected, () => undefined);

    builder
      .addCase(signOutThunk.pending, () => undefined)
      .addCase(signOutThunk.fulfilled, (state) => {
        state.loggedIn = false;
        state.user = undefined;
        state.token = '';
        state.photosToken = '';
      })
      .addCase(signOutThunk.rejected, () => undefined);

    builder
      .addCase(deleteAccountThunk.pending, () => undefined)
      .addCase(deleteAccountThunk.fulfilled, () => undefined)
      .addCase(deleteAccountThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.deleteAccount });
      });

    builder
      .addCase(updateProfileThunk.pending, () => undefined)
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user && Object.assign(state.user, action.payload);
      })
      .addCase(updateProfileThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.updateProfile });
      });
  },
});

export const authSelectors = {
  userFullName: (state: RootState): string => {
    const { user } = state.auth;

    return user ? `${user?.name} ${user?.lastname}` : '';
  },
  nameLetters: (state: RootState): string => {
    const { user } = state.auth;
    const nameLetters: string = (user as User).name[0] + ((user as User).lastname[0] || '');

    return nameLetters.toUpperCase();
  },
};

export const authActions = authSlice.actions;

export const authThunks = {
  initializeThunk,
  signInThunk,
  silentSignInThunk,
  signOutThunk,
  deleteAccountThunk,
  updateProfileThunk,
};

export default authSlice.reducer;
