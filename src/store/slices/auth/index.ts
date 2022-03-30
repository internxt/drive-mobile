import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { deviceStorage, User } from '../../../services/asyncStorage';
import { RootState } from '../..';
import authService from '../../../services/auth';
import userService from '../../../services/user';
import analytics, { AnalyticsEventKey } from '../../../services/analytics';
import { DevicePlatform } from '../../../types';
import { photosActions, photosThunks } from '../photos';
import { appThunks } from '../app';
import { storageActions } from '../storage';
import { uiActions } from '../ui';

export interface AuthState {
  loggedIn: boolean;
  token: string;
  photosToken: string;
  user?: User;
  error?: string;
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
  error: '',
  userStorage: { usage: 0, limit: 0, percentage: 0 },
};

export const signInThunk = createAsyncThunk<
  { token: string; photosToken: string; user: User },
  { email: string; password: string; sKey: string; twoFactorCode: string },
  { state: RootState }
>('auth/signIn', async (payload, { dispatch }) => {
  const result = await userService.signin(payload.email, payload.password, payload.sKey, payload.twoFactorCode);

  await deviceStorage.saveItem('xToken', result.token);
  await deviceStorage.saveItem('photosToken', result.photosToken); // Photos access token
  await deviceStorage.saveItem('xUser', JSON.stringify(result.user));

  dispatch(appThunks.initializeThunk());

  return result;
});

export const signOutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/signOut',
  async (payload: void, { dispatch }) => {
    await authService.signout();

    dispatch(uiActions.resetState());
    dispatch(authActions.resetState());
    dispatch(storageActions.resetState());
    await dispatch(photosThunks.clearDataThunk());
    dispatch(photosActions.resetState());
  },
);

export const paymentThunk = createAsyncThunk<void, { token: string; planId: string }, { state: RootState }>(
  'auth/payment',
  async (payload) => {
    return userService.payment(payload.token, payload.planId);
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    signIn: (state: AuthState, action: PayloadAction<{ token: string; photosToken: string; user: User }>) => {
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
      .addCase(signInThunk.pending, () => undefined)
      .addCase(signInThunk.fulfilled, (state, action) => {
        const { photosToken, token, user } = action.payload;

        analytics
          .identify(user.uuid, {
            email: user.email,
            platform: DevicePlatform.Mobile,
            // eslint-disable-next-line camelcase
            referrals_credit: user.credit,
            // eslint-disable-next-line camelcase
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
      .addCase(signInThunk.rejected, (state, action) => {
        analytics.track(AnalyticsEventKey.UserSignInAttempted, {
          status: 'error',
          message: action.error.message || '',
        });

        state.error = action.error.message;
      });

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
      .addCase(paymentThunk.pending, () => undefined)
      .addCase(paymentThunk.fulfilled, () => undefined)
      .addCase(paymentThunk.rejected, () => undefined);
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
  signInThunk,
  signOutThunk,
  paymentThunk,
};

export default authSlice.reducer;
