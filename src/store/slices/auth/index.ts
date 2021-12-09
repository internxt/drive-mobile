import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { User } from '../../../services/deviceStorage';
import { RootState } from '../..';
import authService from '../../../services/auth';
import userService from '../../../services/user';
import analytics from '../../../services/analytics';
import { DevicePlatform } from '../../../types';

export interface AuthState {
  loggedIn: boolean;
  token: string;
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
  user: undefined,
  error: '',
  userStorage: { usage: 0, limit: 0, percentage: 0 },
};

export const signInThunk = createAsyncThunk<
  { token: string; user: User },
  { email: string; password: string; sKey: string; twoFactorCode: string },
  { state: RootState }
>('auth/signIn', async (payload) => {
  return userService.signin(payload.email, payload.password, payload.sKey, payload.twoFactorCode);
});

export const signOutThunk = createAsyncThunk<void, void, { state: RootState }>('auth/signOut', async () => {
  authService.signout();
});

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
    signIn: (state: AuthState, action: PayloadAction<{ token: string; user: User }>) => {
      state.loggedIn = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    setUserStorage(state, action: PayloadAction<any>) {
      state.userStorage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInThunk.pending, () => undefined)
      .addCase(signInThunk.fulfilled, (state, action) => {
        const { token, user } = action.payload;

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
            analytics.track('user-signin', {
              email: user.email,
              userId: user.uuid,
              platform: DevicePlatform.Mobile,
            });
          });

        state.loggedIn = true;
        state.token = token;
        state.user = user;
      })
      .addCase(signInThunk.rejected, (state, action) => {
        analytics.track('user-signin-attempted', {
          status: 'error',
          message: action.error.message || '',
        });

        state.loggedIn = false;
        state.error = action.error.message;
      });

    builder
      .addCase(signOutThunk.pending, () => undefined)
      .addCase(signOutThunk.fulfilled, (state) => {
        state.loggedIn = false;
        state.user = undefined;
      })
      .addCase(signOutThunk.rejected, () => undefined);

    builder
      .addCase(paymentThunk.pending, () => undefined)
      .addCase(paymentThunk.fulfilled, () => undefined)
      .addCase(paymentThunk.rejected, () => undefined);
  },
});

export const authActions = authSlice.actions;

export const authThunks = {
  signInThunk,
  signOutThunk,
  paymentThunk,
};

export default authSlice.reducer;
