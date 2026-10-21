import { AsyncStorageKey } from '../types';

const mockSecurityDetails = jest.fn();
const mockChangePassword = jest.fn();

jest.mock('./common/sdk/SdkManager', () => ({
  SdkManager: {
    getInstance: jest.fn(() => ({
      get authV2() {
        return { securityDetails: mockSecurityDetails };
      },
      get usersV2() {
        return { changePassword: mockChangePassword };
      },
    })),
    init: jest.fn(),
    setApiSecurity: jest.fn(),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@internxt/mobile-sdk', () => ({ internxtMobileSDKConfig: { destroy: jest.fn() } }));
jest.mock('./AnalyticsService', () => ({
  __esModule: true,
  default: { track: jest.fn() },
  AnalyticsEventKey: { UserLogout: 'user-logout' },
}));
jest.mock('./AppService', () => ({
  __esModule: true,
  default: {},
  constants: { MAGIC_IV: '00'.repeat(16), MAGIC_SALT: '00'.repeat(64) },
}));
jest.mock('../helpers/headers', () => ({ getHeaders: jest.fn() }));

jest.mock('../helpers', () => ({
  decryptText: jest.fn((value: string) => `decrypted(${value})`),
  encryptText: jest.fn((value: string) => `encrypted(${value})`),
  encryptTextWithKey: jest.fn((value: string, password: string) => `encrypted(${value}, ${password})`),
  passToHash: jest.fn(({ password, salt }: { password: string; salt?: string }) => ({
    hash: `hash(${password}, ${salt ?? 'fresh-salt'})`,
    salt: salt ?? 'fresh-salt',
  })),
}));

jest.mock('../helpers/aesUtils', () => ({
  __esModule: true,
  default: {
    encrypt: jest.fn((text: string, password: string) => `locked(${text}, ${password})`),
    decrypt: jest.fn((blob: string, password: string) => `unlocked(${blob}, ${password})`),
  },
}));

const mockGetItem = jest.fn();
const mockGetUser = jest.fn();
jest.mock('./AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    getUser: () => mockGetUser(),
    clearStorage: jest.fn(),
  },
}));

import AesUtils from '../helpers/aesUtils';
import authService from './AuthService';

const STORED_ECC_KEY = 'the encryption key as the server sends it';
const STORED_KYBER_KEY = 'the post-quantum key as the server sends it';

const storedUser = {
  email: 'someone@example.com',
  mnemonic: 'twelve words that make up the recovery phrase',
  keys: {
    ecc: { publicKey: 'ecc public key', privateKey: STORED_ECC_KEY },
    kyber: { publicKey: 'kyber public key', privateKey: STORED_KYBER_KEY },
  },
};

const unlockedWithOldPassword = (storedKey: string) => `unlocked(${storedKey}, the old one)`;
const lockedWithNewPassword = (storedKey: string) => `locked(${unlockedWithOldPassword(storedKey)}, the new one)`;

const changePasswordPayload = () => mockChangePassword.mock.calls[0][0];

describe('Changing the account password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation((key: AsyncStorageKey) =>
      Promise.resolve(key === AsyncStorageKey.Token ? 'the access token' : 'the photos token'),
    );
    mockGetUser.mockResolvedValue(storedUser);
    mockSecurityDetails.mockResolvedValue({ encryptedSalt: 'the stored salt' });
    mockChangePassword.mockResolvedValue({ token: 'a fresh access token', newToken: 'a fresh photos token' });
  });

  test('when the password is changed, then both private keys are unlocked with the password being replaced', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(AesUtils.decrypt).toHaveBeenCalledWith(STORED_ECC_KEY, 'the old one');
    expect(AesUtils.decrypt).toHaveBeenCalledWith(STORED_KYBER_KEY, 'the old one');
  });

  test('when the password is changed, then what gets locked again is the unlocked key and not the stored one', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(AesUtils.encrypt).toHaveBeenCalledWith(unlockedWithOldPassword(STORED_ECC_KEY), 'the new one');
    expect(AesUtils.encrypt).toHaveBeenCalledWith(unlockedWithOldPassword(STORED_KYBER_KEY), 'the new one');
    expect(AesUtils.encrypt).not.toHaveBeenCalledWith(STORED_ECC_KEY, expect.anything());
    expect(AesUtils.encrypt).not.toHaveBeenCalledWith(STORED_KYBER_KEY, expect.anything());
  });

  test('when the password is changed, then neither key is locked again with the password being replaced', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(AesUtils.encrypt).not.toHaveBeenCalledWith(expect.anything(), 'the old one');
  });

  test('when the password is changed, then the private keys sent to the server are never the ones kept on the device', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    const payload = changePasswordPayload();
    expect(payload.keys.encryptedPrivateKey).not.toBe(storedUser.keys.ecc.privateKey);
    expect(payload.keys.encryptedPrivateKyberKey).not.toBe(storedUser.keys.kyber.privateKey);
    expect(payload.keys.encryptedPrivateKey).toBe(lockedWithNewPassword(STORED_ECC_KEY));
    expect(payload.keys.encryptedPrivateKyberKey).toBe(lockedWithNewPassword(STORED_KYBER_KEY));
  });

  test('when the password is changed, then the field kept for older clients carries the same encryption key', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    const payload = changePasswordPayload();
    expect(payload.encryptedPrivateKey).toBe(payload.keys.encryptedPrivateKey);
  });

  test('when the password is changed, then the current password is proven with the salt the server holds', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(mockSecurityDetails).toHaveBeenCalledWith(storedUser.email);
    expect(changePasswordPayload().currentEncryptedPassword).toBe(
      'encrypted(hash(the old one, decrypted(the stored salt)))',
    );
  });

  test('when the password is changed, then the recovery phrase is re-encrypted with the new password', async () => {
    await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(changePasswordPayload().encryptedMnemonic).toBe(`encrypted(${storedUser.mnemonic}, the new one)`);
  });

  test('when the server accepts the change, then the caller gets the new session tokens and the re-encrypted keys', async () => {
    const result = await authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' });

    expect(result).toEqual({
      token: 'a fresh access token',
      newToken: 'a fresh photos token',
      encryptedPrivateKeys: {
        ecc: lockedWithNewPassword(STORED_ECC_KEY),
        kyber: lockedWithNewPassword(STORED_KYBER_KEY),
      },
    });
  });

  test('when the account details cannot be read from the server, then the password is left untouched', async () => {
    mockSecurityDetails.mockResolvedValue(undefined);

    await expect(authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' })).rejects.toThrow(
      'Security details not found',
    );
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  test('when there is no session stored on the device, then the password is left untouched', async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(
      authService.doChangePassword({ password: 'the old one', newPassword: 'the new one' }),
    ).rejects.toThrow();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
