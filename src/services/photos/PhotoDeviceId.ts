import { PhotoDevice } from '@internxt/sdk/dist/drive/photos';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import { logger } from 'src/services/common';
import secureStorageService from 'src/services/SecureStorageService';
import { AsyncStorageKey } from 'src/types';
import { PhotoDeviceNameConflictError } from './errors';
import { photosDeviceService } from './photosDeviceService';

const TAG = '[PhotoDeviceManager]';

export interface PhotoDeviceInfo {
  deviceId: string;
  plainName: string; // device key used as backend name
  bucket: string;
}

const getOrGenerateFallbackKey = async (): Promise<string> => {
  const stored = await secureStorageService.getItem(AsyncStorageKey.PhotosDeviceKey);
  if (stored) {
    return stored;
  }
  const generated = uuid.v4() as string;
  await secureStorageService.setItem(AsyncStorageKey.PhotosDeviceKey, generated);
  logger.warn(TAG, `No stable device key available — generated fallback key=${generated}`);
  return generated;
};

/**
 * Returns a stable, opaque per-device identifier.
 * - Android: androidId
 * - iOS: identifierForVendor
 * - Fallback: UUID generated once and persisted in SecureStorage
 */
const getDeviceUniqueId = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId?.();
    if (androidId) {
      return androidId;
    }
  } else {
    const idfv = await Application.getIosIdForVendorAsync();
    if (idfv) {
      return idfv;
    }
  }
  return getOrGenerateFallbackKey();
};

const getDisplayName = (): string | null =>
  Platform.OS === 'android' ? (Device.deviceName ?? Device.modelName) : Device.modelName;

const buildDeviceKey = (uniqueId: string): string => {
  const displayName = getDisplayName();
  return displayName ? `${displayName} (${uniqueId})` : uniqueId;
};

const storeDevice = (uuid: string): Promise<void> => secureStorageService.setItem(AsyncStorageKey.PhotosDeviceId, uuid);

const parseDeviceInfo = (device: PhotoDevice): PhotoDeviceInfo => ({
  deviceId: device.uuid,
  plainName: device.plainName,
  bucket: device.bucket,
});

/**
 * Ensures the current device has a folder in the Photos bucket.
 * - iOS: Keychain survives uninstall → uuid is recovered directly.
 * - Android: EncryptedSharedPreferences is wiped on uninstall, device is re-identified
 *   by androidId (stable hardware key); on a 409 the existing folder is adopted by key.
 */
class PhotoDeviceManagerService {
  private pendingDeviceFolder: Promise<PhotoDeviceInfo> | null = null;

  ensureDeviceFolder(): Promise<PhotoDeviceInfo> {
    if (this.pendingDeviceFolder) {
      return this.pendingDeviceFolder;
    }
    this.pendingDeviceFolder = this.resolveDeviceFolder().finally(() => {
      this.pendingDeviceFolder = null;
    });
    return this.pendingDeviceFolder;
  }

  private async resolveDeviceFolder(): Promise<PhotoDeviceInfo> {
    const storedUuid = await secureStorageService.getItem(AsyncStorageKey.PhotosDeviceId);

    if (storedUuid) {
      const existingDevice = await photosDeviceService.getDevice(storedUuid);
      if (existingDevice?.status === 'EXISTS') {
        logger.info(
          TAG,
          `Reusing device folder uuid=${existingDevice.uuid} key="${existingDevice.plainName}" bucket=${existingDevice.bucket}`,
        );
        return parseDeviceInfo(existingDevice);
      }
      logger.warn(TAG, `Stored uuid=${storedUuid} not found or DELETED — recreating by key`);
    }

    const uniqueId = await getDeviceUniqueId();
    const deviceKey = buildDeviceKey(uniqueId);
    try {
      const createdDevice = await photosDeviceService.createDevice(deviceKey);
      await storeDevice(createdDevice.uuid);
      logger.info(
        TAG,
        `Created device folder uuid=${createdDevice.uuid} key="${createdDevice.plainName}" bucket=${createdDevice.bucket}`,
      );
      return parseDeviceInfo(createdDevice);
    } catch (err) {
      if (err instanceof PhotoDeviceNameConflictError) {
        logger.info(TAG, `Device key "${deviceKey}" already exists (409) — adopting by uniqueId`);
        const devices = await photosDeviceService.listDevices();
        const device = devices.find((device) => device.plainName.includes(uniqueId) && device.status === 'EXISTS');
        if (device) {
          await storeDevice(device.uuid);
          logger.info(TAG, `Adopted device folder uuid=${device.uuid} bucket=${device.bucket}`);
          return parseDeviceInfo(device);
        }
      }
      throw err;
    }
  }
}

export const PhotoDeviceManager = new PhotoDeviceManagerService();
