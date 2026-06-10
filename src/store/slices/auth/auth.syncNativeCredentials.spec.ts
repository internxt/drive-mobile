jest.mock('../../../services/native/InternxtAuthCredentialsModule', () => ({
  setCredentials: jest.fn().mockResolvedValue(undefined),
  clearCredentials: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  imageService: {},
  PROFILE_PICTURE_CACHE_KEY: 'profile-picture',
  SdkManager: { init: jest.fn(), setApiSecurity: jest.fn(), getInstance: jest.fn() },
}));

jest.mock('../drive', () => ({ driveActions: { resetState: jest.fn(() => ({ type: 'drive/resetState' })) } }));
jest.mock('../ui', () => ({ uiActions: { resetState: jest.fn(() => ({ type: 'ui/resetState' })) } }));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: { clear: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('src/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));

jest.mock('../../../services/AppService', () => {
  const appConstants = {
    DRIVE_NEW_API_URL: 'https://drive',
    BRIDGE_URL: 'https://bridge',
    CLOUDFLARE_TOKEN: 'cf',
    CRYPTO_SECRET: 'crypto-secret',
    CRYPTO_SECRET2: 'crypto-secret-2',
  };
  return { __esModule: true, default: { constants: appConstants }, constants: appConstants };
});

jest.mock('../../../services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    saveItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue('current-photos-token'),
    deleteItem: jest.fn().mockResolvedValue(undefined),
    clearStorage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../services/AuthService', () => ({
  __esModule: true,
  default: {
    emitLoginEvent: jest.fn(),
    emitLogoutEvent: jest.fn(),
    signout: jest.fn().mockResolvedValue(undefined),
    refreshAuthToken: jest.fn(),
    getAuthCredentials: jest.fn(),
  },
}));

jest.mock('../../../services/NotificationsService', () => ({ __esModule: true, default: {} }));
jest.mock('../../../services/UserService', () => ({ __esModule: true, default: {} }));

import authService from '../../../services/AuthService';
import { clearCredentials, setCredentials } from '../../../services/native/InternxtAuthCredentialsModule';
import { refreshTokensThunk, signInThunk, signOutThunk } from './index';

const setCredentialsMock = setCredentials as jest.Mock;
const clearCredentialsMock = clearCredentials as jest.Mock;
const refreshAuthTokenMock = authService.refreshAuthToken as jest.Mock;
const getAuthCredentialsMock = authService.getAuthCredentials as jest.Mock;

const user = {
  userId: 'user-1',
  bridgeUser: 'bridge@internxt.com',
  mnemonic: 'pretty cloud secret words',
  rootFolderUuid: 'root-uuid-123',
  email: 'user@internxt.com',
} as never;

type DispatchableThunk = (dispatch: jest.Mock, getState: jest.Mock, extra: undefined) => Promise<unknown>;

const runThunk = (action: unknown) =>
  (action as DispatchableThunk)(jest.fn(), jest.fn(), undefined);

describe('auth thunks native credentials handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when the login completes, then the wrapper receives the new token', async () => {
    await runThunk(signInThunk({ user, token: 'access-token', newToken: 'login-new-token' }));

    expect(setCredentialsMock).toHaveBeenCalledWith(
      expect.objectContaining({ bearerToken: 'login-new-token', rootFolderUuid: 'root-uuid-123' }),
    );
  });

  it('when the token is refreshed in the foreground, then the wrapper receives the refreshed token', async () => {
    refreshAuthTokenMock.mockResolvedValue({ token: 'access-2', newToken: 'refreshed-new-token' });
    getAuthCredentialsMock.mockResolvedValue({
      credentials: { accessToken: 'access-2', photosToken: 'refreshed-new-token', user },
    });

    await runThunk(refreshTokensThunk());

    expect(setCredentialsMock).toHaveBeenCalledWith(expect.objectContaining({ bearerToken: 'refreshed-new-token' }));
  });

  it('when the logout completes, then clearCredentials is invoked', async () => {
    await runThunk(signOutThunk({ reason: 'manual' }));

    expect(clearCredentialsMock).toHaveBeenCalledTimes(1);
  });
});
