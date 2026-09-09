import { configureStore } from '@reduxjs/toolkit';
import { clearMailLocalData } from '../../../services/mail/clearMailLocalData';
import authReducer, { signOutThunk } from './index';

jest.mock('../../../services/mail/clearMailLocalData', () => ({
  clearMailLocalData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../photos', () => ({ signOutThunk: jest.fn(() => ({ type: 'photos/signOut' })) }));
jest.mock('../drive', () => ({ driveActions: { resetState: jest.fn(() => ({ type: 'drive/resetState' })) } }));
jest.mock('../ui', () => ({ uiActions: { resetState: jest.fn(() => ({ type: 'ui/resetState' })) } }));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: { clear: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  imageService: { deleteCachedImage: jest.fn(), cacheImage: jest.fn() },
  PROFILE_PICTURE_CACHE_KEY: 'profile-picture',
  SdkManager: { getInstance: jest.fn(() => ({})) },
}));
jest.mock('../../../services/AuthService', () => ({
  __esModule: true,
  default: { signout: jest.fn().mockResolvedValue(undefined), emitLogoutEvent: jest.fn() },
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
});
