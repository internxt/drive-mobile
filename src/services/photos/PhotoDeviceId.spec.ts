import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import asyncStorageService from 'src/services/AsyncStorageService';
import secureStorageService from 'src/services/SecureStorageService';
import { PhotoDeviceNameConflictError } from './errors';
import { PhotoDeviceManager } from './PhotoDeviceId';
import { photoDeviceIdentityStore } from './PhotoDeviceIdentityStore';
import { photosDeviceService } from './photosDeviceService';

jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(() => 'test-android-id'),
  getIosIdForVendorAsync: jest.fn(() => Promise.resolve('test-idfv')),
}));

jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: jest.fn(() => 'generated-uuid-fallback') },
}));

jest.mock('expo-device', () => ({
  deviceName: 'Internxt iPhone',
  modelName: 'iPhone 15',
}));

jest.mock('src/services/SecureStorageService', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(),
  },
}));

jest.mock('./photosDeviceService', () => ({
  photosDeviceService: {
    getDevice: jest.fn(),
    createDevice: jest.fn(),
    listDevices: jest.fn(),
  },
}));

jest.mock('./PhotoDeviceIdentityStore', () => ({
  PHOTOS_DEVICE_KEY: 'photos-device-key',
  photoDeviceIdentityStore: {
    getValidFor: jest.fn(),
    save: jest.fn(),
    clearAccount: jest.fn(),
    clearAll: jest.fn(),
  },
}));

const mockGetItem = secureStorageService.getItem as jest.Mock;
const mockSetItem = secureStorageService.setItem as jest.Mock;
const mockGetUser = asyncStorageService.getUser as jest.Mock;
const mockGetDevice = photosDeviceService.getDevice as jest.Mock;
const mockCreateDevice = photosDeviceService.createDevice as jest.Mock;
const mockListDevices = photosDeviceService.listDevices as jest.Mock;
const mockGetAndroidId = Application.getAndroidId as jest.Mock;
const mockGetValidFor = photoDeviceIdentityStore.getValidFor as jest.Mock;
const mockSaveIdentity = photoDeviceIdentityStore.save as jest.Mock;
const mockClearAccount = photoDeviceIdentityStore.clearAccount as jest.Mock;

const setPlatform = (os: 'android' | 'ios') =>
  Object.defineProperty(Platform, 'OS', { value: os, writable: true, configurable: true });

const makeDevice = (plainName: string) => ({
  uuid: 'folder-uuid-123',
  plainName,
  bucket: 'photos-bucket',
  status: 'EXISTS' as const,
});

const CURRENT_USER_EMAIL = 'user@internxt.com';

beforeEach(() => {
  jest.clearAllMocks();
  mockSetItem.mockResolvedValue(undefined);
  mockGetUser.mockResolvedValue({ email: CURRENT_USER_EMAIL });
  mockGetValidFor.mockResolvedValue(null);
  setPlatform('android');
});

describe('PhotoDeviceManager.ensureDeviceFolder — stored identity', () => {
  test('when a stored identity matches the current account email and device model, then the device folder is reused without creating a new one', async () => {
    mockGetValidFor.mockResolvedValue({
      deviceId: 'folder-uuid-123',
      email: CURRENT_USER_EMAIL,
      model: 'Internxt iPhone',
    });
    mockGetDevice.mockResolvedValue(makeDevice('test-android-id'));

    const result = await PhotoDeviceManager.ensureDeviceFolder();

    expect(result).toEqual({ deviceId: 'folder-uuid-123', plainName: 'test-android-id', bucket: 'photos-bucket' });
    expect(mockCreateDevice).not.toHaveBeenCalled();
    expect(mockGetValidFor).toHaveBeenCalledWith(CURRENT_USER_EMAIL, 'Internxt iPhone');
    expect(mockSaveIdentity).toHaveBeenCalledWith({
      deviceId: 'folder-uuid-123',
      email: CURRENT_USER_EMAIL,
      model: 'Internxt iPhone',
    });
  });

  test('when the store reports no identity valid for the current account/hardware, then it is treated as absent and a new device folder is created', async () => {
    mockGetValidFor.mockResolvedValue(null);
    mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (test-android-id)'));

    const result = await PhotoDeviceManager.ensureDeviceFolder();

    expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (test-android-id)');
    expect(result.deviceId).toBe('folder-uuid-123');
  });

  test('when the stored device has been deleted on the backend, then a new one is created by device key', async () => {
    mockGetValidFor.mockResolvedValue({
      deviceId: 'folder-uuid-old',
      email: CURRENT_USER_EMAIL,
      model: 'Internxt iPhone',
    });
    mockGetDevice.mockResolvedValue({ ...makeDevice('test-android-id'), uuid: 'folder-uuid-old', status: 'DELETED' });
    mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (test-android-id)'));

    const result = await PhotoDeviceManager.ensureDeviceFolder();

    expect(result.deviceId).toBe('folder-uuid-123');
    expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (test-android-id)');
  });

  test('when reusing a stored device returns 403, then the stored identity is cleared and a new device folder is created', async () => {
    mockGetValidFor.mockResolvedValue({
      deviceId: 'folder-uuid-other-user',
      email: CURRENT_USER_EMAIL,
      model: 'Internxt iPhone',
    });
    mockGetDevice.mockRejectedValue(
      new AxiosResponseError('Forbidden', 'GET /photos/devices/:uuid', { status: 403 } as never),
    );
    mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (test-android-id)'));

    const result = await PhotoDeviceManager.ensureDeviceFolder();

    expect(mockClearAccount).toHaveBeenCalledWith(CURRENT_USER_EMAIL);
    expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (test-android-id)');
    expect(result.deviceId).toBe('folder-uuid-123');
  });
});

describe('PhotoDeviceManager.ensureDeviceFolder — no identity to reuse', () => {
  describe('on Android', () => {
    beforeEach(() => setPlatform('android'));

    test('when no folder exists yet, then a new device folder is created using the device name and the android hardware id', async () => {
      mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (test-android-id)'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result).toEqual({
        deviceId: 'folder-uuid-123',
        plainName: 'Internxt iPhone (test-android-id)',
        bucket: 'photos-bucket',
      });
      expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (test-android-id)');
      expect(mockSaveIdentity).toHaveBeenCalledWith({
        deviceId: 'folder-uuid-123',
        email: CURRENT_USER_EMAIL,
        model: 'Internxt iPhone',
      });
    });

    test('when creation returns 409, then the existing folder matching the android hardware id is adopted', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('Internxt iPhone (test-android-id)'));
      mockListDevices.mockResolvedValue([makeDevice('Internxt iPhone (test-android-id)')]);

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result).toEqual({
        deviceId: 'folder-uuid-123',
        plainName: 'Internxt iPhone (test-android-id)',
        bucket: 'photos-bucket',
      });
      expect(mockSaveIdentity).toHaveBeenCalledWith({
        deviceId: 'folder-uuid-123',
        email: CURRENT_USER_EMAIL,
        model: 'Internxt iPhone',
      });
    });

    test('when creation returns 409 and the remote device name has a different model but contains the same hardware id, then it is adopted anyway', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('Internxt iPhone (test-android-id)'));
      mockListDevices.mockResolvedValue([makeDevice('Old Model Name (test-android-id)')]);

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.plainName).toBe('Old Model Name (test-android-id)');
    });

    test('when creation returns 409 but no folder matches the android hardware id, then the error is rethrown', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('Internxt iPhone (test-android-id)'));
      mockListDevices.mockResolvedValue([makeDevice('Internxt iPhone (other-device-id)')]);

      await expect(PhotoDeviceManager.ensureDeviceFolder()).rejects.toThrow(PhotoDeviceNameConflictError);
    });

    test('when creation returns 409 and the matching folder is deleted, then the error is rethrown', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('Internxt iPhone (test-android-id)'));
      mockListDevices.mockResolvedValue([{ ...makeDevice('Internxt iPhone (test-android-id)'), status: 'DELETED' }]);

      await expect(PhotoDeviceManager.ensureDeviceFolder()).rejects.toThrow(PhotoDeviceNameConflictError);
    });
  });

  describe('on iOS', () => {
    beforeEach(() => setPlatform('ios'));

    test('when no folder exists yet, then a new device folder is created using the model name and the identifierForVendor', async () => {
      mockCreateDevice.mockResolvedValue(makeDevice('iPhone 15 (test-idfv)'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.deviceId).toBe('folder-uuid-123');
      expect(mockCreateDevice).toHaveBeenCalledWith('iPhone 15 (test-idfv)');
    });

    test('when creation returns 409, then the existing folder matching the identifierForVendor is adopted', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('iPhone 15 (test-idfv)'));
      mockListDevices.mockResolvedValue([makeDevice('iPhone 15 (test-idfv)')]);

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.deviceId).toBe('folder-uuid-123');
      expect(mockSaveIdentity).toHaveBeenCalled();
    });
  });

  describe('when no hardware id or device name is available', () => {
    beforeEach(() => {
      setPlatform('android');
      mockGetAndroidId.mockReturnValue(null);
    });

    test('when no device key is stored either, then a uuid is generated, persisted and used as device key', async () => {
      mockGetItem.mockResolvedValue(null);
      mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (generated-uuid-fallback)'));

      await PhotoDeviceManager.ensureDeviceFolder();

      expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (generated-uuid-fallback)');
      expect(mockSetItem).toHaveBeenCalledWith('photos-device-key', 'generated-uuid-fallback');
    });

    test('when a previously generated key is already stored, then it is reused without generating a new one', async () => {
      mockGetItem.mockResolvedValue('previously-generated-key');
      mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone (previously-generated-key)'));

      await PhotoDeviceManager.ensureDeviceFolder();

      expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone (previously-generated-key)');
      expect(mockSetItem).not.toHaveBeenCalledWith('photos-device-key', expect.anything());
    });
  });
});

describe('PhotoDeviceManager concurrent calls', () => {
  test('when ensureDeviceFolder is called twice before the first resolves, then the backend is only called once and both callers receive the same result', async () => {
    let resolveCreate!: (device: ReturnType<typeof makeDevice>) => void;
    mockCreateDevice.mockReturnValue(
      new Promise((r) => {
        resolveCreate = r;
      }),
    );

    const [p1, p2] = [PhotoDeviceManager.ensureDeviceFolder(), PhotoDeviceManager.ensureDeviceFolder()];

    // Flush microtasks so resolveDeviceFolder reaches the createDevice call
    await new Promise((r) => setImmediate(r));
    resolveCreate(makeDevice('iPhone'));

    const [result1, result2] = await Promise.all([p1, p2]);

    expect(mockCreateDevice).toHaveBeenCalledTimes(1);
    expect(result1.deviceId).toBe('folder-uuid-123');
    expect(result2.deviceId).toBe('folder-uuid-123');
  });
});
