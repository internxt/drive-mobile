import authService from '../AuthService';

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

const buildToken = (payload: Record<string, unknown>): string => {
  const base64UrlEncode = (value: string) =>
    Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));

  return `${header}.${body}.signature`;
};

describe('AuthService.tokenNeedsRefresh', () => {
  test('when more than 50% of the token lifetime remains, then it does not need refresh', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const totalLifetimeInSeconds = 60 * 60 * 24;

    const token = buildToken({
      iat: nowInSeconds - totalLifetimeInSeconds * 0.1,
      exp: nowInSeconds + totalLifetimeInSeconds * 0.9,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(false);
  });

  test('when less than 50% of the token lifetime remains, then it needs refresh', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const totalLifetimeInSeconds = 60 * 60 * 24;

    const token = buildToken({
      iat: nowInSeconds - totalLifetimeInSeconds * 0.6,
      exp: nowInSeconds + totalLifetimeInSeconds * 0.4,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(true);
  });

  test('when the token lifetime is short, then the same 50% rule still applies', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const totalLifetimeInSeconds = 60 * 60 * 12;

    const token = buildToken({
      iat: nowInSeconds - totalLifetimeInSeconds * 0.4,
      exp: nowInSeconds + totalLifetimeInSeconds * 0.6,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(false);
  });

  test('when the token has already expired, then it needs refresh', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const token = buildToken({
      iat: nowInSeconds - 100,
      exp: nowInSeconds - 1,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(true);
  });

  test('when the token has no expiration claim, then it needs refresh', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const token = buildToken({
      iat: nowInSeconds,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(true);
  });

  test('when the token has no issued-at claim, then it does not need refresh if more than 6 hours remain', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const token = buildToken({
      exp: nowInSeconds + 60 * 60 * 24,
    });

    expect(authService.tokenNeedsRefresh(token)).toBe(false);
  });

  test('when the token cannot be decoded, then it needs refresh', () => {
    expect(authService.tokenNeedsRefresh('not-a-token')).toBe(true);
  });
});
