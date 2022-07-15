import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import asyncStorageService from '../../../services/AsyncStorageService';
import { RootState } from '../..';
import authService from '../../../services/AuthService';
import userService from '../../../services/UserService';
import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import { AsyncStorageKey, DevicePlatform, NotificationType } from '../../../types';
import { photosActions, photosThunks } from '../photos';
import { driveActions, driveThunks } from '../drive';
import { uiActions } from '../ui';
import notificationsService from '../../../services/NotificationsService';
import strings from '../../../../assets/lang/strings';
import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SecurityDetails, TwoFactorAuthQR } from '@internxt/sdk';

export interface AuthState {
  loggedIn: boolean;
  token: string;
  photosToken: string;
  user: UserSettings | undefined;
  securityDetails: SecurityDetails | undefined;
  sessionPassword: string | undefined;
}

const initialState: AuthState = {
  loggedIn: false,
  token: '',
  photosToken: '',
  user: undefined,
  securityDetails: undefined,
  sessionPassword: undefined,
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/initialize',
  async (payload, { getState, dispatch }) => {
    const { loggedIn, token, user } = getState().auth;

    if (loggedIn && user) {
      authService.initialize(token, user?.mnemonic);
      dispatch(refreshUserThunk());
      dispatch(loadSecurityDetailsThunk());
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
  { token: string; photosToken: string; user: UserSettings },
  { email: string; password: string; sKey: string; twoFactorCode: string },
  { state: RootState }
>('auth/signIn', async (payload) => {
  const result = await userService.signin(payload.email, payload.password, payload.sKey, payload.twoFactorCode);

  await asyncStorageService.saveItem(AsyncStorageKey.Token, result.token);
  await asyncStorageService.saveItem(AsyncStorageKey.PhotosToken, result.photosToken); // Photos access token
  await asyncStorageService.saveItem(AsyncStorageKey.User, JSON.stringify(result.user));

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

    dispatch(photosThunks.clearPhotosThunk());
    dispatch(photosActions.resetState());

    authService.emitLogoutEvent();
  },
);

export const refreshUserThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/refreshUser',
  async (payload: void, { dispatch }) => {
    const { user, token } = await userService.refreshUser();
    const { avatar, emailVerified, name, lastname } = user;

    dispatch(authActions.updateUser({ avatar, emailVerified, name, lastname }));
    dispatch(authActions.setToken(token));
  },
);

export const sendVerificationEmailThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/sendVerificationEmail',
  async () => {
    await userService.sendVerificationEmail();
  },
);

export const loadSecurityDetailsThunk = createAsyncThunk<SecurityDetails, void, { state: RootState }>(
  'auth/loadSecurityDetails',
  async (payload: void, { getState }) => {
    const { user } = getState().auth;
    const securityDetails = await authService.is2FAEnabled(user?.email as string);

    return securityDetails;
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

export const changeProfilePictureThunk = createAsyncThunk<string, { name: string; uri: string }, { state: RootState }>(
  'auth/changeProfilePicture',
  async ({ name, uri }, { getState }) => {
    const { avatar } = (await userService.updateUserAvatar({ name, uri })) as { avatar: string };

    await asyncStorageService.saveItem(
      AsyncStorageKey.User,
      JSON.stringify(Object.assign({}, getState().auth.user as UserSettings, { avatar })),
    );

    return avatar;
  },
);

export const deleteProfilePictureThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/deleteProfilePicture',
  async (payload, { getState }) => {
    await userService.deleteUserAvatar();

    await asyncStorageService.saveItem(
      AsyncStorageKey.User,
      JSON.stringify(Object.assign({}, getState().auth.user as UserSettings, { avatar: null })),
    );
  },
);

export const generateNewTwoFactorThunk = createAsyncThunk<TwoFactorAuthQR, void, { state: RootState }>(
  'auth/generateNewTwoFactor',
  async () => {
    return authService.generateNew2FA();
  },
);

export const enableTwoFactorThunk = createAsyncThunk<
  SecurityDetails,
  { backupKey: string; code: string },
  { state: RootState }
>('auth/enableTwoFactor', async ({ backupKey, code }, { getState }) => {
  const { user } = getState().auth;
  await authService.enable2FA(backupKey, code);

  const securityDetails = await authService.is2FAEnabled(user?.email as string);

  return securityDetails;
});

export const disableTwoFactorThunk = createAsyncThunk<void, { code: string }, { state: RootState }>(
  'auth/disableTwoFactor',
  async ({ code }, { getState }) => {
    const { user, sessionPassword } = getState().auth;
    const { encryptedSalt } = await authService.is2FAEnabled(user?.email as string);

    return authService.disable2FA(encryptedSalt, sessionPassword as string, code);
  },
);

export const changePasswordThunk = createAsyncThunk<void, { newPassword: string }, { state: RootState }>(
  'auth/changePassword',
  async ({ newPassword }, { dispatch }) => {
    await authService.doRecoverPassword(newPassword);

    dispatch(authActions.setSessionPassword(newPassword));
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setSignInData: (state, action: PayloadAction<{ token: string; photosToken: string; user: UserSettings }>) => {
      state.loggedIn = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.photosToken = action.payload.photosToken;
    },
    updateUser(state, action: PayloadAction<Partial<UserSettings>>) {
      state.user && Object.assign(state.user, action.payload);
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    setSessionPassword(state, action: PayloadAction<string | undefined>) {
      state.sessionPassword = action.payload;
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
            createdAt: user.createdAt.toString(),
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

    builder
      .addCase(changeProfilePictureThunk.pending, () => undefined)
      .addCase(changeProfilePictureThunk.fulfilled, (state, action) => {
        if (state.user) {
          state.user.avatar = action.payload;
        }
      })
      .addCase(changeProfilePictureThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.uploadAvatar });
      });

    builder
      .addCase(deleteProfilePictureThunk.pending, () => undefined)
      .addCase(deleteProfilePictureThunk.fulfilled, (state) => {
        if (state.user) {
          state.user.avatar = null;
        }
      })
      .addCase(deleteProfilePictureThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.deleteAvatar });
      });

    builder.addCase(loadSecurityDetailsThunk.fulfilled, (state, action) => {
      state.securityDetails = action.payload;
    });

    builder.addCase(generateNewTwoFactorThunk.rejected, () => {
      notificationsService.show({ type: NotificationType.Error, text1: strings.errors.generateNew2FA });
    });

    builder
      .addCase(enableTwoFactorThunk.fulfilled, (state, action) => {
        state.securityDetails = action.payload;
      })
      .addCase(enableTwoFactorThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.enable2FA });
      });

    builder
      .addCase(disableTwoFactorThunk.fulfilled, (state) => {
        state.securityDetails = undefined;
      })
      .addCase(disableTwoFactorThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.disable2FA });
      });

    builder
      .addCase(sendVerificationEmailThunk.fulfilled, () => {
        notificationsService.show({ type: NotificationType.Success, text1: strings.messages.sendVerificationEmail });
      })
      .addCase(sendVerificationEmailThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.sendVerificationEmail });
      });

    builder
      .addCase(changePasswordThunk.fulfilled, () => {
        notificationsService.show({ text1: strings.messages.passwordChanged, type: NotificationType.Success });
      })
      .addCase(changePasswordThunk.rejected, () => {
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.changePassword });
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
    const nameLetters: string = user ? user.name[0] + (user.lastname[0] || '') : '';

    return nameLetters.toUpperCase();
  },
  hasAvatar: (state: RootState): boolean => !!state.auth.user?.avatar,
  is2FAEnabled: (state: RootState): boolean => !!state.auth.securityDetails?.tfaEnabled,
};

export const authActions = authSlice.actions;

export const authThunks = {
  initializeThunk,
  signInThunk,
  silentSignInThunk,
  signOutThunk,
  refreshUserThunk,
  deleteAccountThunk,
  updateProfileThunk,
  changeProfilePictureThunk,
  deleteProfilePictureThunk,
  generateNewTwoFactorThunk,
  enableTwoFactorThunk,
  disableTwoFactorThunk,
  sendVerificationEmailThunk,
  changePasswordThunk,
};

export default authSlice.reducer;
