import * as SecureStore from 'expo-secure-store';
import { AsyncStorageKey } from '../types';
import secureStorageService from './SecureStorageService';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedSecureStore = jest.mocked(SecureStore);

const createLargeString = (size: number): string => 'x'.repeat(size);

const mockUserData = {
  email: 'test@example.com',
  userId: 'user123',
  mnemonic: 'test mnemonic phrase here',
  privateKey: 'LS0tLS1CRUdJTiBQR1A...',
  publicKey: 'LS0tLS1CRUdJTiBQVUJMSUM...',
  keys: {
    ecc: {
      privateKey: createLargeString(1200),
      publicKey: createLargeString(800),
    },
    kyber: {
      privateKey: createLargeString(3000),
      publicKey: createLargeString(1000),
    },
  },
  revocationKey: 'LS0tLS1CRUdJTiBSRVZPQ0FUSU9O...',
  name: 'Test User',
  avatar: 'https://example.com/avatar.png',
};

describe('SecureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Blob = jest.fn().mockImplementation((content) => ({
      size: content[0].length,
    })) as any;
  });

  describe('When storing regular items', () => {
    it('Should store a regular item in SecureStore', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValueOnce(undefined);

      await secureStorageService.setItem('testKey', 'testValue');

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('Should retrieve a regular item from SecureStore', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValueOnce('testValue');

      const result = await secureStorageService.getItem('testKey');

      expect(result).toBe('testValue');
      expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith('testKey');
    });

    it('Should remove a regular item from SecureStore', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValueOnce(undefined);

      await secureStorageService.removeItem('testKey');

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('testKey');
    });
  });

  describe('When storing user data', () => {
    it('Should store user data by separating critical fields', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(mockUserData));

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_mnemonic`,
        JSON.stringify(mockUserData.mnemonic),
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_privateKey`,
        JSON.stringify(mockUserData.privateKey),
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_publicKey`,
        JSON.stringify(mockUserData.publicKey),
      );

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_ecc_privateKey`,
        mockUserData.keys.ecc.privateKey,
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_ecc_publicKey`,
        mockUserData.keys.ecc.publicKey,
      );

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_kyber_privateKey_chunks`,
        '2',
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_0`,
        expect.any(String),
      );

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_data`,
        expect.stringContaining('"email":"test@example.com"'),
      );
    });

    it('Should not include critical fields in clean user data', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(mockUserData));

      const cleanDataCall = mockedSecureStore.setItemAsync.mock.calls.find(
        (call) => call[0] === `${AsyncStorageKey.User}_data`,
      );

      const cleanDataStr = cleanDataCall?.[1] as string;
      const cleanData = JSON.parse(cleanDataStr);

      expect(cleanData).not.toHaveProperty('mnemonic');
      expect(cleanData).not.toHaveProperty('privateKey');
      expect(cleanData).not.toHaveProperty('publicKey');
      expect(cleanData).not.toHaveProperty('keys');
      expect(cleanData).not.toHaveProperty('revocationKey');
      expect(cleanData).toHaveProperty('email');
      expect(cleanData).toHaveProperty('name');
    });

    it('Should use chunks for clean data if it exceeds size limit', async () => {
      const largeUserData = {
        ...mockUserData,
        largeField: createLargeString(2000),
      };

      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(largeUserData));

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_data_chunks`,
        expect.any(String),
      );
    });
  });

  describe('When retrieving user data', () => {
    it('Should reconstruct user data from all stored parts', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) {
          return JSON.stringify({ email: 'test@example.com', name: 'Test User' });
        }
        if (key === `${AsyncStorageKey.User}_mnemonic`) {
          return JSON.stringify(mockUserData.mnemonic);
        }
        if (key === `${AsyncStorageKey.User}_privateKey`) {
          return JSON.stringify(mockUserData.privateKey);
        }
        if (key === `${AsyncStorageKey.User}_keys_ecc_privateKey`) {
          return mockUserData.keys.ecc.privateKey;
        }
        if (key === `${AsyncStorageKey.User}_keys_ecc_publicKey`) {
          return mockUserData.keys.ecc.publicKey;
        }
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey`) {
          return mockUserData.keys.kyber.privateKey;
        }
        if (key === `${AsyncStorageKey.User}_keys_kyber_publicKey`) {
          return mockUserData.keys.kyber.publicKey;
        }
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);
      const userData = JSON.parse(result!);

      expect(userData).toHaveProperty('email', 'test@example.com');
      expect(userData).toHaveProperty('mnemonic', mockUserData.mnemonic);
      expect(userData).toHaveProperty('privateKey', mockUserData.privateKey);
      expect(userData).toHaveProperty('keys.ecc.privateKey', mockUserData.keys.ecc.privateKey);
      expect(userData).toHaveProperty('keys.kyber.publicKey', mockUserData.keys.kyber.publicKey);
    });

    it('Should handle missing critical fields gracefully', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) {
          return JSON.stringify({ email: 'test@example.com', name: 'Test User' });
        }
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);
      const userData = JSON.parse(result!);

      expect(userData).toHaveProperty('email', 'test@example.com');
      expect(userData).not.toHaveProperty('mnemonic');
      expect(userData).not.toHaveProperty('keys');
    });

    it('Should return null if clean data does not exist', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorageService.getItem(AsyncStorageKey.User);

      expect(result).toBeNull();
    });
  });

  describe('When handling large values with chunks', () => {
    it('Should store large values in chunks when they are user critical fields', async () => {
      const userDataWithLargeKey = {
        ...mockUserData,
        keys: {
          ecc: {
            privateKey: createLargeString(1200),
            publicKey: createLargeString(800),
          },
          kyber: {
            privateKey: createLargeString(3000),
            publicKey: createLargeString(1000),
          },
        },
      };

      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(userDataWithLargeKey));

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_kyber_privateKey_chunks`,
        '2',
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_0`,
        expect.any(String),
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_1`,
        expect.any(String),
      );
    });

    it('Should retrieve large values from chunks when they are user critical fields', async () => {
      const originalValue = createLargeString(3000);
      const chunk1 = originalValue.slice(0, 1800);
      const chunk2 = originalValue.slice(1800);

      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) {
          return JSON.stringify({ email: 'test@example.com', name: 'Test User' });
        }

        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey`) return null;
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunks`) return '2';
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_0`) return chunk1;
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_1`) return chunk2;
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);
      const userData = JSON.parse(result!);

      expect(userData.keys.kyber.privateKey).toBe(originalValue);
    });

    it('Should store small values directly without chunks', async () => {
      const userDataWithSmallKeys = {
        ...mockUserData,
        keys: {
          ecc: {
            privateKey: createLargeString(500),
            publicKey: createLargeString(400),
          },
        },
      };

      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(userDataWithSmallKeys));

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_ecc_privateKey`,
        userDataWithSmallKeys.keys.ecc.privateKey,
      );
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_keys_ecc_privateKey_chunks`,
        expect.any(String),
      );
    });

    it('Should handle missing chunks gracefully', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) {
          return JSON.stringify({ email: 'test@example.com', name: 'Test User' });
        }

        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey`) return null;
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunks`) return '2';
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_0`) return 'chunk1';
        if (key === `${AsyncStorageKey.User}_keys_kyber_privateKey_chunk_1`) return null;
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);
      const userData = JSON.parse(result!);

      expect(userData.keys?.kyber?.privateKey).toBeUndefined();
    });
  });

  describe('When handling clean user data chunks', () => {
    it('Should use chunks for clean data if it exceeds size limit', async () => {
      const largeUserData = {
        email: 'test@example.com',
        name: 'Test User',
        largeField: createLargeString(2000),
      };

      mockedSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorageService.setItem(AsyncStorageKey.User, JSON.stringify(largeUserData));

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_data_chunks`,
        expect.any(String),
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${AsyncStorageKey.User}_data_chunk_0`,
        expect.any(String),
      );
    });

    it('Should retrieve clean data from chunks', async () => {
      const largeCleanData = JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        largeField: createLargeString(2000),
      });
      const chunk1 = largeCleanData.slice(0, 1800);
      const chunk2 = largeCleanData.slice(1800);

      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) return null;
        if (key === `${AsyncStorageKey.User}_data_chunks`) return '2';
        if (key === `${AsyncStorageKey.User}_data_chunk_0`) return chunk1;
        if (key === `${AsyncStorageKey.User}_data_chunk_1`) return chunk2;
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);
      const userData = JSON.parse(result!);

      expect(userData.email).toBe('test@example.com');
      expect(userData.largeField).toBe(createLargeString(2000));
    });
  });

  describe('When checking if items exist', () => {
    it('Should return true if regular item exists', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValueOnce('value');

      const exists = await secureStorageService.hasItem('testKey');

      expect(exists).toBe(true);
    });

    it('Should return true if user data exists', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) return 'userData';
        return null;
      });

      const exists = await secureStorageService.hasItem(AsyncStorageKey.User);

      expect(exists).toBe(true);
    });

    it('Should return true if user data exists as chunks', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) return null;
        if (key === `${AsyncStorageKey.User}_data_chunks`) return '2';
        return null;
      });

      const exists = await secureStorageService.hasItem(AsyncStorageKey.User);

      expect(exists).toBe(true);
    });

    it('Should return false if item does not exist', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const exists = await secureStorageService.hasItem('nonExistentKey');

      expect(exists).toBe(false);
    });
  });

  describe('When removing items', () => {
    it('Should remove all user data including critical fields and chunks', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key.includes('chunks')) return '2';
        return null;
      });

      await secureStorageService.removeItem(AsyncStorageKey.User);

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${AsyncStorageKey.User}_mnemonic`);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${AsyncStorageKey.User}_privateKey`);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${AsyncStorageKey.User}_keys_ecc_privateKey`);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${AsyncStorageKey.User}_keys_kyber_privateKey`);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(`${AsyncStorageKey.User}_data`);
    });

    it('Should remove multiple items', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      await secureStorageService.removeMultipleItems(['key1', 'key2']);

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('key1');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('key2');
    });
  });

  describe('When getting existing items', () => {
    it('Should return only existing items from a list', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === 'existingKey') return 'value';
        return null;
      });

      const existingItems = await secureStorageService.getExistingItems(['existingKey', 'nonExistentKey']);

      expect(existingItems).toEqual(['existingKey']);
    });
  });

  describe('When handling errors', () => {
    it('Should handle SecureStore errors gracefully when setting items', async () => {
      mockedSecureStore.setItemAsync.mockRejectedValueOnce(new Error('SecureStore error'));

      await expect(secureStorageService.setItem('testKey', 'testValue')).rejects.toThrow('SecureStore error');
    });

    it('Should return null when getting items fails', async () => {
      mockedSecureStore.getItemAsync.mockRejectedValueOnce(new Error('SecureStore error'));

      const result = await secureStorageService.getItem('testKey');

      expect(result).toBeNull();
    });

    it('Should handle errors when removing items', async () => {
      mockedSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('SecureStore error'));

      await secureStorageService.removeItem('testKey');

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('testKey');
    });

    it('Should handle JSON parsing errors when retrieving user data', async () => {
      mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === `${AsyncStorageKey.User}_data`) return 'invalid json';
        return null;
      });

      const result = await secureStorageService.getItem(AsyncStorageKey.User);

      expect(result).toBeNull();
    });
  });
});
