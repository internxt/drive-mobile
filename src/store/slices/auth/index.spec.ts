import { SdkManager } from '@internxt-mobile/services/common';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { configureStore } from '@reduxjs/toolkit';
import asyncStorageService from '../../../services/AsyncStorageService';
import authService from '../../../services/AuthService';
import { clearMailLocalData } from '../../../services/mail/clearMailLocalData';
import { AsyncStorageKey } from '../../../types';
import { mailActions } from '../mail';
import authReducer, { authActions, changePasswordThunk, signOutThunk } from './index';

jest.mock('../../../services/mail/clearMailLocalData', () => ({
  clearMailLocalData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../photos', () => ({ signOutThunk: jest.fn(() => ({ type: 'photos/signOut' })) }));
jest.mock('../drive', () => ({ driveActions: { resetState: jest.fn(() => ({ type: 'drive/resetState' })) } }));
jest.mock('../ui', () => ({ uiActions: { resetState: jest.fn(() => ({ type: 'ui/resetState' })) } }));
jest.mock('../mail', () => ({ mailActions: { resetState: jest.fn(() => ({ type: 'mail/resetState' })) } }));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: { clear: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  imageService: { deleteCachedImage: jest.fn(), cacheImage: jest.fn() },
  PROFILE_PICTURE_CACHE_KEY: 'profile-picture',
  SdkManager: { getInstance: jest.fn(() => ({})), init: jest.fn(), setApiSecurity: jest.fn() },
}));
jest.mock('../../../services/AuthService', () => ({
  __esModule: true,
  default: {
    signout: jest.fn().mockResolvedValue(undefined),
    emitLogoutEvent: jest.fn(),
    doChangePassword: jest.fn(),
  },
}));
jest.mock('src/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('../../../services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), saveItem: jest.fn(), deleteItem: jest.fn() },
}));
jest.mock('../../../services/NotificationsService', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('../../../services/UserService', () => ({ __esModule: true, default: { refreshUser: jest.fn() } }));
jest.mock('../../../../assets/lang/strings', () => ({ __esModule: true, default: { messages: {}, errors: {} } }));

const makeStore = () => configureStore({ reducer: { auth: authReducer } });

describe('Signing out', () => {
  beforeEach(() => jest.clearAllMocks());

  test('when the user signs out, then everything mail keeps on the device is deleted', async () => {
    const store = makeStore();

    await store.dispatch(signOutThunk({ reason: 'manual' }) as never);

    expect(clearMailLocalData).toHaveBeenCalledTimes(1);
  });

  test('when the user signs out, then no mailbox keeps the emails it had loaded', async () => {
    const store = makeStore();

    await store.dispatch(signOutThunk({ reason: 'manual' }) as never);

    expect(mailActions.resetState).toHaveBeenCalledTimes(1);
  });
});

describe('Changing the account password', () => {
  const storedUser = {
    email: 'someone@example.com',
    keys: {
      ecc: { publicKey: 'ecc public key', privateKey: 'the ecc key locked with the old password' },
      kyber: { publicKey: 'kyber public key', privateKey: 'the kyber key locked with the old password' },
    },
  } as unknown as UserSettings;

  const makeSignedInStore = () => {
    const store = makeStore();
    store.dispatch(
      authActions.setSignInData({ token: 'the old access token', photosToken: 'the old photos token', user: storedUser }),
    );
    store.dispatch(authActions.setSessionPassword('the old one'));
    return store;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.doChangePassword as jest.Mock).mockResolvedValue({
      token: 'a fresh access token',
      newToken: 'a fresh photos token',
      encryptedPrivateKeys: {
        ecc: 'the ecc key locked with the new password',
        kyber: 'the kyber key locked with the new password',
      },
    });
  });

  test('when the password is changed, then the keys kept on the device are replaced by the ones locked with the new password', async () => {
    const store = makeSignedInStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    const savedUser = store.getState().auth.user;
    expect(savedUser?.keys.ecc.privateKey).toBe('the ecc key locked with the new password');
    expect(savedUser?.keys.kyber.privateKey).toBe('the kyber key locked with the new password');
  });

  test('when the password is changed, then the public keys are left as they were', async () => {
    const store = makeSignedInStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    const savedUser = store.getState().auth.user;
    expect(savedUser?.keys.ecc.publicKey).toBe('ecc public key');
    expect(savedUser?.keys.kyber.publicKey).toBe('kyber public key');
  });

  test('when the password is changed, then the account saved on the device carries the new keys too', async () => {
    const store = makeSignedInStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    const savedAccount = (asyncStorageService.saveItem as jest.Mock).mock.calls.find(
      ([key]) => key === AsyncStorageKey.User,
    );
    expect(savedAccount).toBeDefined();
    expect(JSON.parse(savedAccount?.[1]).keys).toEqual({
      ecc: { publicKey: 'ecc public key', privateKey: 'the ecc key locked with the new password' },
      kyber: { publicKey: 'kyber public key', privateKey: 'the kyber key locked with the new password' },
    });
  });

  test('when the password is changed, then the new session tokens are saved and handed to the api client', async () => {
    const store = makeSignedInStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    expect(asyncStorageService.saveItem).toHaveBeenCalledWith(AsyncStorageKey.Token, 'a fresh access token');
    expect(asyncStorageService.saveItem).toHaveBeenCalledWith(AsyncStorageKey.PhotosToken, 'a fresh photos token');
    expect(SdkManager.setApiSecurity).toHaveBeenCalledWith({
      token: 'a fresh access token',
      newToken: 'a fresh photos token',
    });
    expect(store.getState().auth.sessionPassword).toBe('the new one');
  });

  test('when there is no password for the session, then nothing is asked of the server', async () => {
    const store = makeStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    expect(authService.doChangePassword).not.toHaveBeenCalled();
  });

  test('when the server does not return the new tokens, then the keys on the device are left as they were', async () => {
    (authService.doChangePassword as jest.Mock).mockResolvedValue({ token: '', newToken: '' });
    const store = makeSignedInStore();

    await store.dispatch(changePasswordThunk({ newPassword: 'the new one' }) as never);

    expect(store.getState().auth.user?.keys.ecc.privateKey).toBe('the ecc key locked with the old password');
    expect(asyncStorageService.saveItem).not.toHaveBeenCalledWith(AsyncStorageKey.User, expect.anything());
  });
});
