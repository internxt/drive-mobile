import secureStorageService from 'src/services/SecureStorageService';
import { photoDeviceIdentityStore } from './PhotoDeviceIdentityStore';

jest.mock('src/services/SecureStorageService', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockGetItem = secureStorageService.getItem as jest.Mock;
const mockSetItem = secureStorageService.setItem as jest.Mock;
const mockRemoveItem = secureStorageService.removeItem as jest.Mock;

const identityA = { deviceId: 'folder-uuid-a', email: 'a@internxt.com', model: 'iPhone 15' };
const identityB = { deviceId: 'folder-uuid-b', email: 'b@internxt.com', model: 'iPhone 15' };
const identityC = { deviceId: 'folder-uuid-c', email: 'c@internxt.com', model: 'iPhone 15' };
const identityD = { deviceId: 'folder-uuid-d', email: 'd@internxt.com', model: 'iPhone 15' };

const setStoredEntries = (entries: unknown[]) => mockGetItem.mockResolvedValue(JSON.stringify(entries));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PhotoDeviceIdentityStore.getValidFor', () => {
  test('when the stored entry for this account matches the current model, then it is returned', async () => {
    setStoredEntries([identityA]);

    const result = await photoDeviceIdentityStore.getValidFor('a@internxt.com', 'iPhone 15');

    expect(result).toEqual(identityA);
  });

  test('when there is no entry for the current account, then null is returned without touching other accounts', async () => {
    setStoredEntries([identityB]);

    const result = await photoDeviceIdentityStore.getValidFor('a@internxt.com', 'iPhone 15');

    expect(result).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  test('when the stored entry for this account has a different device model, then it is discarded and null is returned, leaving other accounts untouched', async () => {
    setStoredEntries([identityA, identityB]);

    const result = await photoDeviceIdentityStore.getValidFor('a@internxt.com', 'iPhone 16 Pro');

    expect(result).toBeNull();
    expect(mockSetItem).toHaveBeenCalledWith('photos-device-identity', JSON.stringify([identityB]));
  });

  test('when there is no current email, then null is returned without touching the stored entries', async () => {
    setStoredEntries([identityA]);

    const result = await photoDeviceIdentityStore.getValidFor(undefined, 'iPhone 15');

    expect(result).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  test('when a match is found, then it is promoted to the front as most recently used', async () => {
    setStoredEntries([identityB, identityA]);

    await photoDeviceIdentityStore.getValidFor('a@internxt.com', 'iPhone 15');

    expect(mockSetItem).toHaveBeenCalledWith('photos-device-identity', JSON.stringify([identityA, identityB]));
  });
});

describe('PhotoDeviceIdentityStore.save', () => {
  test('when there is room, then the new identity is added to the front', async () => {
    setStoredEntries([identityB]);

    await photoDeviceIdentityStore.save(identityA);

    expect(mockSetItem).toHaveBeenCalledWith('photos-device-identity', JSON.stringify([identityA, identityB]));
  });

  test('when the same account is saved again, then its previous entry is replaced, not duplicated', async () => {
    setStoredEntries([identityA, identityB]);
    const updatedIdentityA = { ...identityA, deviceId: 'folder-uuid-a-updated' };

    await photoDeviceIdentityStore.save(updatedIdentityA);

    expect(mockSetItem).toHaveBeenCalledWith('photos-device-identity', JSON.stringify([updatedIdentityA, identityB]));
  });

  test('when saving a 4th account, then the least recently used one is evicted', async () => {
    setStoredEntries([identityC, identityB, identityA]);

    await photoDeviceIdentityStore.save(identityD);

    expect(mockSetItem).toHaveBeenCalledWith(
      'photos-device-identity',
      JSON.stringify([identityD, identityC, identityB]),
    );
  });
});

describe('PhotoDeviceIdentityStore.clearAccount', () => {
  test('when clearing one account, then only its entry is removed', async () => {
    setStoredEntries([identityA, identityB]);

    await photoDeviceIdentityStore.clearAccount('a@internxt.com');

    expect(mockSetItem).toHaveBeenCalledWith('photos-device-identity', JSON.stringify([identityB]));
  });

  test('when clearing the only remaining account, then the whole key is removed', async () => {
    setStoredEntries([identityA]);

    await photoDeviceIdentityStore.clearAccount('a@internxt.com');

    expect(mockRemoveItem).toHaveBeenCalledWith('photos-device-identity');
  });

  test('when the account has no stored entry, then nothing is written', async () => {
    setStoredEntries([identityB]);

    await photoDeviceIdentityStore.clearAccount('a@internxt.com');

    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});

describe('PhotoDeviceIdentityStore.clearAll', () => {
  test('when clearing all entries, then the whole key is removed', async () => {
    await photoDeviceIdentityStore.clearAll();

    expect(mockRemoveItem).toHaveBeenCalledWith('photos-device-identity');
  });
});
