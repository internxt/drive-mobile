import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKey } from '../types';
import asyncStorageService from './AsyncStorageService';

const mockSecureStore = new Map<string, string>();
const mockPlainStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => Promise.resolve(mockPlainStore.set(key, value))),
  getItem: jest.fn((key: string) => Promise.resolve(mockPlainStore.get(key) ?? null)),
  removeItem: jest.fn((key: string) => Promise.resolve(mockPlainStore.delete(key))),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => mockPlainStore.delete(key));
    return Promise.resolve();
  }),
}));

jest.mock('./SecureStorageService', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((key: string, value: string) => Promise.resolve(mockSecureStore.set(key, value))),
    getItem: jest.fn((key: string) => Promise.resolve(mockSecureStore.get(key) ?? null)),
    removeItem: jest.fn((key: string) => Promise.resolve(mockSecureStore.delete(key))),
    removeMultipleItems: jest.fn((keys: string[]) => {
      keys.forEach((key) => mockSecureStore.delete(key));
      return Promise.resolve();
    }),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

describe('Storing the data of the mail account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.clear();
    mockPlainStore.clear();
  });

  test('when the mail private key is saved, then it goes to secure storage and not to plain storage', async () => {
    await asyncStorageService.saveItem(AsyncStorageKey.MailAccountPrivateKey, 'the-private-key');

    await expect(asyncStorageService.getItem(AsyncStorageKey.MailAccountPrivateKey)).resolves.toBe('the-private-key');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('when all the stored data is cleared, then the mail private key is no longer stored', async () => {
    await asyncStorageService.saveItem(AsyncStorageKey.MailAccountPrivateKey, 'the-private-key');

    await asyncStorageService.clearStorage();

    await expect(asyncStorageService.getItem(AsyncStorageKey.MailAccountPrivateKey)).resolves.toBeNull();
  });

  test('when all the stored data is cleared, then the address of the mail account is no longer stored', async () => {
    await asyncStorageService.saveItem(AsyncStorageKey.MyMailEmailAdress, 'someone@inxt.me');

    await asyncStorageService.clearStorage();

    await expect(asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress)).resolves.toBeNull();
  });
});
