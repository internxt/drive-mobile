import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { imageService, logger, PROFILE_PICTURE_CACHE_KEY, SdkManager } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { SecurityDetails, TwoFactorAuthQR } from '@internxt/sdk';
import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import errorService from 'src/services/ErrorService';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import asyncStorageService from '../../../services/AsyncStorageService';
import authService from '../../../services/AuthService';
import notificationsService from '../../../services/NotificationsService';
import { default as userService } from '../../../services/UserService';
import { AsyncStorageKey, NotificationType } from '../../../types';
import { driveActions } from '../drive';
import { uiActions } from '../ui';
export interface AuthState {
  loggedIn: boolean | null;
  token: string;
  photosToken: string;
  user: UserSettings | undefined;
  securityDetails: SecurityDetails | undefined;
  sessionPassword: string | undefined;
}

const initialState: AuthState = {
  loggedIn: null,
  token: '',
  photosToken: '',
  user: undefined,
  securityDetails: undefined,
  sessionPassword: undefined,
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/initialize',
  async (_, { dispatch }) => {
    const { credentials } = await authService.getAuthCredentials();

    if (credentials) {
      SdkManager.init({
        token: credentials.accessToken,
        newToken: credentials.photosToken,
      });
      errorService.setGlobalErrorContext({
        email: credentials.user.email,
        userId: credentials.user.userId,
      });

      dispatch(refreshUserThunk());
      dispatch(loadSecurityDetailsThunk());
    } else {
      dispatch(authActions.setLoggedIn(false));
    }
  },
);

/**
 * TO DO review the auth flow since this event driven stuff + Redux
 * is getting ouf of hands, this thunk and the signIn thunk looks the
 * same but are not the same WTF
 */
export const silentSignInThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/silentSignIn',
  async (payload, { dispatch }) => {
    try {
      const { credentials } = await authService.getAuthCredentials();

      // Check if local tokens are expired
      const newTokenIsExpired = authService.authTokenHasExpired(credentials.photosToken);
      if (newTokenIsExpired) throw new Error('New token is expired');

      const tokenIsExpired = authService.authTokenHasExpired(credentials.accessToken);
      if (tokenIsExpired) throw new Error('Token is expired');

      SdkManager.init({
        token: credentials.accessToken,
        newToken: credentials.photosToken,
      });

      dispatch(
        authActions.setSignInData({
          token: credentials.accessToken,
          photosToken: credentials.photosToken,
          user: credentials.user,
        }),
      );

      authService.emitLoginEvent();
    } catch (error) {
      dispatch(authActions.setLoggedIn(false));
    }
  },
);

export const signInThunk = createAsyncThunk<
  { token: string; photosToken: string; user: UserSettings },
  { user: UserSettings; token: string; newToken: string },
  { state: RootState }
>('auth/signIn', async (payload, { dispatch }) => {
  let userToSave = payload.user;
  SdkManager.init({
    token: payload.token,
    newToken: payload.newToken,
  });
  if (!payload.user.rootFolderId) {
    userToSave = {
      ...userToSave,
    };
  }

  // Set the new SDK tokens
  SdkManager.setApiSecurity({
    token: payload.token,
    newToken: payload.newToken,
  });

  await asyncStorageService.saveItem(AsyncStorageKey.Token, payload.token);
  await asyncStorageService.saveItem(AsyncStorageKey.PhotosToken, payload.newToken); // Photos access token
  await asyncStorageService.saveItem(AsyncStorageKey.User, JSON.stringify(userToSave));
  // Reset this, in case we logged out during the pull process
  await asyncStorageService.deleteItem(AsyncStorageKey.LastPhotoPulledDate);
  dispatch(
    authActions.setSignInData({
      token: payload.token,
      photosToken: payload.newToken,
      user: userToSave,
    }),
  );

  authService.emitLoginEvent();
  return {
    user: userToSave,
    token: payload.token,
    photosToken: payload.newToken,
  };
});

export const refreshTokensThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/refreshTokens',
  async (_, { dispatch }) => {
    try {
      const currentAuthToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
      if (!currentAuthToken) throw new Error('Auth token not found');
      const refreshed = await authService.refreshAuthToken(currentAuthToken);

      if (!refreshed) {
        // eslint-disable-next-line no-console
        console.warn(
          'Unable to refresh the tokens, but the server did not return an Unauthorized message, tokens are not refreshed but old tokens could be still valid',
        );

        return;
      }
      logger.info('Auth tokens refreshed');
      await asyncStorageService.saveItem(AsyncStorageKey.Token, refreshed.token);
      await asyncStorageService.saveItem(AsyncStorageKey.PhotosToken, refreshed.newToken);

      // Get the current credentials
      const { credentials } = await authService.getAuthCredentials();

      // Pass the new tokens to the SdkManager
      SdkManager.init({
        token: credentials.accessToken,
        newToken: credentials.photosToken,
      });

      // Set the new SignIn data
      dispatch(
        authActions.setSignInData({
          token: credentials.accessToken,
          photosToken: credentials.photosToken,
          user: credentials.user,
        }),
      );
    } catch (err) {
      asyncStorageService.clearStorage();
      dispatch(authActions.setLoggedIn(false));
      dispatch(authThunks.signOutThunk());
    }
  },
);

export const signOutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/signOut',
  async (_, { dispatch }) => {
    authService.signout().catch(errorService.reportError);
    drive.clear().catch(errorService.reportError);
    dispatch(uiActions.resetState());
    dispatch(authActions.resetState());
    dispatch(driveActions.resetState());
    dispatch(authActions.setLoggedIn(false));
    authService.emitLogoutEvent();
  },
);

export const refreshUserThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/refreshUser',
  async (payload: void, { dispatch, getState }) => {
    const { user: currentUserData } = getState().auth;

    const res = await userService.refreshUser(currentUserData?.uuid as string);
    const { user, oldToken: token, newToken } = res;
    const { avatar, emailVerified, name, lastname } = user;

    if (avatar) {
      await imageService.deleteCachedImage(PROFILE_PICTURE_CACHE_KEY);
      await imageService.cacheImage(avatar, PROFILE_PICTURE_CACHE_KEY);
    }

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
    const securityDetails = await authService.getSecurityDetails(user?.email as string);

    return securityDetails;
  },
);

export const deleteAccountThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/deleteAccount',
  async (payload, { getState }) => {
    const { user } = getState().auth;
    const token = SdkManager.getInstance().getApiSecurity().newToken;
    user && (await authService.deleteAccount(token));

    await asyncStorageService.saveItem(AsyncStorageKey.IsDeletingAccount, 'DELETING');
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
  async ({ name, uri }, { getState, dispatch }) => {
    const { avatar } = (await userService.updateUserAvatar({ name, uri })) as { avatar: string };

    await asyncStorageService.saveItem(
      AsyncStorageKey.User,
      JSON.stringify(Object.assign({}, getState().auth.user as UserSettings, { avatar })),
    );

    await dispatch(authThunks.refreshUserThunk()).unwrap();

    return avatar;
  },
);

export const deleteProfilePictureThunk = createAsyncThunk<void, void, { state: RootState }>(
  'auth/deleteProfilePicture',
  async (payload, { getState, dispatch }) => {
    await userService.deleteUserAvatar();
    await imageService.deleteCachedImage(PROFILE_PICTURE_CACHE_KEY);
    await asyncStorageService.saveItem(
      AsyncStorageKey.User,
      JSON.stringify(Object.assign({}, getState().auth.user as UserSettings, { avatar: null })),
    );

    await dispatch(authThunks.refreshUserThunk()).unwrap();
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

  const securityDetails = await authService.getSecurityDetails(user?.email as string);

  return securityDetails;
});

export const disableTwoFactorThunk = createAsyncThunk<void, { code: string }, { state: RootState }>(
  'auth/disableTwoFactor',
  async ({ code }, { getState }) => {
    const { user, sessionPassword } = getState().auth;
    const { encryptedSalt } = await authService.getSecurityDetails(user?.email as string);

    return authService.disable2FA(encryptedSalt, sessionPassword as string, code);
  },
);

export const changePasswordThunk = createAsyncThunk<void, { newPassword: string }, { state: RootState }>(
  'auth/changePassword',
  async ({ newPassword }, { dispatch, getState }) => {
    const { sessionPassword } = getState().auth;
    if (!sessionPassword) throw new Error('No session password found');
    const { token, newToken } = await authService.doChangePassword({
      password: sessionPassword,
      newPassword: newPassword,
    });

    if (!token || !newToken) throw new Error('No tokens found, this is fatal');

    await asyncStorageService.saveItem(AsyncStorageKey.Token, token);
    await asyncStorageService.saveItem(AsyncStorageKey.PhotosToken, newToken);
    const user = getState().auth.user;
    if (!user) throw new Error('No user found, this is fatal');

    SdkManager.setApiSecurity({
      token,
      newToken,
    });

    dispatch(
      authActions.setSignInData({
        token: token,
        photosToken: newToken,
        user,
      }),
    );
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

    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.loggedIn = action.payload;
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
        setTimeout(() => {
          notificationsService.show({
            text1: strings.messages.passwordChanged,
            type: NotificationType.Success,
          });
        }, 750);
      })
      .addCase(changePasswordThunk.rejected, () => {
        setTimeout(() => {
          notificationsService.show({ type: NotificationType.Error, text1: strings.errors.changePassword });
        }, 750);
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
  refreshTokensThunk,
};

export default authSlice.reducer;
