jest.mock('../../../modules/network-cache', () => ({
  NetworkCacheModule: {
    clearNetworkCache: jest.fn(),
  },
}));
jest.mock('../AppService', () => ({
  default: {
    constants: {
      DRIVE_NEW_API_URL: 'https://api.test.com',
      CRYPTO_SECRET: 'test-secret',
    },
  },
  constants: {
    DRIVE_NEW_API_URL: 'https://api.test.com',
    CRYPTO_SECRET: 'test-secret',
  },
}));
jest.mock('../../helpers/headers', () => ({
  getHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer test-token' }),
}));
jest.mock('../common/sdk/SdkManager', () => ({
  SdkManager: {
    getInstance: jest.fn().mockReturnValue({
      authV2: {},
      usersV2: {},
    }),
  },
}));

global.fetch = jest.fn();

import { NetworkCacheModule } from '../../../modules/network-cache';
import authService from '../AuthService';

describe('AuthService.refreshAuthToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when first attempt succeeds, then returns tokens without retry', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        newToken: 'new-token-123',
        token: 'token-456',
        user: { email: 'test@example.com' },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await authService.refreshAuthToken('current-token');

    expect(result).toEqual({
      newToken: 'new-token-123',
      token: 'token-456',
      user: { email: 'test@example.com' },
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(NetworkCacheModule.clearNetworkCache).not.toHaveBeenCalled();
  });

  it('when first attempt fails, then clears cache and retries successfully', async () => {
    const errorResponse = {
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    };
    const successResponse = {
      ok: true,
      json: async () => ({
        newToken: 'new-token-retry',
        token: 'token-retry',
        user: { email: 'test@example.com' },
      }),
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    (NetworkCacheModule.clearNetworkCache as jest.Mock).mockResolvedValueOnce(true);

    const result = await authService.refreshAuthToken('current-token');

    expect(result).toEqual({
      newToken: 'new-token-retry',
      token: 'token-retry',
      user: { email: 'test@example.com' },
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(NetworkCacheModule.clearNetworkCache).toHaveBeenCalledTimes(1);
  });

  it('when both attempts fail, then throws error after retry', async () => {
    const errorResponse = {
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(errorResponse);
    (NetworkCacheModule.clearNetworkCache as jest.Mock).mockResolvedValueOnce(true);

    await expect(authService.refreshAuthToken('current-token')).rejects.toThrow(
      'Tokens no longer valid, should sign out',
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(NetworkCacheModule.clearNetworkCache).toHaveBeenCalledTimes(1);
  });

  it('when cache clearing fails, then does not retry and throws error', async () => {
    const errorResponse = {
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);
    (NetworkCacheModule.clearNetworkCache as jest.Mock).mockRejectedValueOnce(
      new Error('Cache clear failed'),
    );

    await expect(authService.refreshAuthToken('current-token')).rejects.toThrow(
      'Tokens no longer valid, should sign out',
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(NetworkCacheModule.clearNetworkCache).toHaveBeenCalledTimes(1);
  });

  it('when called recursively, then retries only once to prevent infinite loop', async () => {
    const errorResponse = {
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(errorResponse);
    (NetworkCacheModule.clearNetworkCache as jest.Mock).mockResolvedValue(true);

    await expect(authService.refreshAuthToken('current-token')).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(NetworkCacheModule.clearNetworkCache).toHaveBeenCalledTimes(1);
  });
});
