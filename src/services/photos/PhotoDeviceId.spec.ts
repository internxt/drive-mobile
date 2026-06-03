import * as Application from 'expo-application';
import { Platform } from 'react-native';
import secureStorageService from 'src/services/SecureStorageService';
import { PhotoDeviceNameConflictError } from './errors';
import { PhotoDeviceManager } from './PhotoDeviceId';
import { photosDeviceService } from './photosDeviceService';

jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(() => 'test-android-id'),
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

jest.mock('./photosDeviceService', () => ({
  photosDeviceService: {
    getDevice: jest.fn(),
    createDevice: jest.fn(),
    listDevices: jest.fn(),
  },
}));

const mockGetItem = secureStorageService.getItem as jest.Mock;
const mockSetItem = secureStorageService.setItem as jest.Mock;
const mockGetDevice = photosDeviceService.getDevice as jest.Mock;
const mockCreateDevice = photosDeviceService.createDevice as jest.Mock;
const mockListDevices = photosDeviceService.listDevices as jest.Mock;
const mockGetAndroidId = Application.getAndroidId as jest.Mock;

const setPlatform = (os: 'android' | 'ios') =>
  Object.defineProperty(Platform, 'OS', { value: os, writable: true, configurable: true });

const makeDevice = (plainName: string) => ({
  uuid: 'folder-uuid-123',
  plainName,
  bucket: 'photos-bucket',
  status: 'EXISTS' as const,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSetItem.mockResolvedValue(undefined);
  setPlatform('android');
});

describe('PhotoDeviceManager.ensureDeviceFolder', () => {
  describe('when a folder uuid is stored in secure storage', () => {
    test('when the stored folder still exists, then it is returned without creating a new one', async () => {
      mockGetItem.mockResolvedValue('folder-uuid-123');
      mockGetDevice.mockResolvedValue(makeDevice('test-android-id'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result).toEqual({ deviceId: 'folder-uuid-123', plainName: 'test-android-id', bucket: 'photos-bucket' });
      expect(mockCreateDevice).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    test('when the stored folder has been deleted on the backend, then a new one is created by device key', async () => {
      mockGetItem.mockResolvedValue('folder-uuid-old');
      mockGetDevice.mockResolvedValue({ ...makeDevice('test-android-id'), uuid: 'folder-uuid-old', status: 'DELETED' });
      mockCreateDevice.mockResolvedValue(makeDevice('test-android-id'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.deviceId).toBe('folder-uuid-123');
      expect(mockCreateDevice).toHaveBeenCalledWith('test-android-id');
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'folder-uuid-123');
    });

    test('when the stored folder is not found on the backend, then a new one is created by device key', async () => {
      mockGetItem.mockResolvedValue('folder-uuid-gone');
      mockGetDevice.mockResolvedValue(null);
      mockCreateDevice.mockResolvedValue(makeDevice('test-android-id'));

      await PhotoDeviceManager.ensureDeviceFolder();

      expect(mockCreateDevice).toHaveBeenCalledWith('test-android-id');
    });
  });

  describe('when no folder uuid is stored on Android', () => {
    beforeEach(() => {
      setPlatform('android');
      mockGetItem.mockResolvedValue(null);
    });

    test('when no folder exists yet, then a new device folder is created using the android hardware id', async () => {
      mockCreateDevice.mockResolvedValue(makeDevice('test-android-id'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result).toEqual({ deviceId: 'folder-uuid-123', plainName: 'test-android-id', bucket: 'photos-bucket' });
      expect(mockCreateDevice).toHaveBeenCalledWith('test-android-id');
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'folder-uuid-123');
    });

    test('when creation returns 409, then the existing folder matching the android hardware id is adopted', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('test-android-id'));
      mockListDevices.mockResolvedValue([makeDevice('test-android-id')]);

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result).toEqual({ deviceId: 'folder-uuid-123', plainName: 'test-android-id', bucket: 'photos-bucket' });
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'folder-uuid-123');
    });

    test('when creation returns 409 but no folder matches the android hardware id, then the error is rethrown', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('test-android-id'));
      mockListDevices.mockResolvedValue([makeDevice('other-device-id')]);

      await expect(PhotoDeviceManager.ensureDeviceFolder()).rejects.toThrow(PhotoDeviceNameConflictError);
    });

    test('when creation returns 409 and the matching folder is deleted, then the error is rethrown', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('test-android-id'));
      mockListDevices.mockResolvedValue([{ ...makeDevice('test-android-id'), status: 'DELETED' }]);

      await expect(PhotoDeviceManager.ensureDeviceFolder()).rejects.toThrow(PhotoDeviceNameConflictError);
    });
  });

  describe('when no folder uuid is stored on iOS', () => {
    beforeEach(() => {
      setPlatform('ios');
      mockGetItem.mockResolvedValue(null);
    });

    test('when no folder exists yet, then a new device folder is created using the device name', async () => {
      mockCreateDevice.mockResolvedValue(makeDevice('Internxt iPhone'));

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.deviceId).toBe('folder-uuid-123');
      expect(mockCreateDevice).toHaveBeenCalledWith('Internxt iPhone');
    });

    test('when creation returns 409, then the existing folder matching the device name is adopted', async () => {
      mockCreateDevice.mockRejectedValue(new PhotoDeviceNameConflictError('Internxt iPhone'));
      mockListDevices.mockResolvedValue([makeDevice('Internxt iPhone')]);

      const result = await PhotoDeviceManager.ensureDeviceFolder();

      expect(result.deviceId).toBe('folder-uuid-123');
      expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'folder-uuid-123');
    });
  });

  describe('when no hardware id or device name is available', () => {
    beforeEach(() => {
      setPlatform('android');
      mockGetAndroidId.mockReturnValue(null);
      // mockGetItem: first call for PhotosDeviceId (null), second call for PhotosDeviceKey (null)
      mockGetItem.mockResolvedValue(null);
    });

    test('when no device key is stored either, then a uuid is generated, persisted and used as device key', async () => {
      mockCreateDevice.mockResolvedValue(makeDevice('generated-uuid-fallback'));

      await PhotoDeviceManager.ensureDeviceFolder();

      expect(mockCreateDevice).toHaveBeenCalledWith('generated-uuid-fallback');
      expect(mockSetItem).toHaveBeenCalledWith('photos-device-key', 'generated-uuid-fallback');
    });

    test('when a previously generated key is already stored, then it is reused without generating a new one', async () => {
      mockGetItem
        .mockResolvedValueOnce(null) // PhotosDeviceId
        .mockResolvedValueOnce('previously-generated-key'); // PhotosDeviceKey
      mockCreateDevice.mockResolvedValue(makeDevice('previously-generated-key'));

      await PhotoDeviceManager.ensureDeviceFolder();

      expect(mockCreateDevice).toHaveBeenCalledWith('previously-generated-key');
      expect(mockSetItem).not.toHaveBeenCalledWith('photos-device-key', expect.anything());
    });
  });
});
