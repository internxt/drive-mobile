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
 * Returns a stable, opaque key used as the backend device name.
 * - Android: androidId (survives reinstalls, unique per device + signing key)
 * - iOS: human-readable device name (Keychain survives reinstalls, name is stable)
 * - Fallback: UUID generated once and persisted in SecureStorage (collision-proof)
 */
const getDeviceKey = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId?.();
    if (androidId) return androidId;
  } else {
    const name = Device.deviceName ?? Device.modelName;
    if (name) return name;
  }
  return getOrGenerateFallbackKey();
};

const persist = (uuid: string): Promise<void> => secureStorageService.setItem(AsyncStorageKey.PhotosDeviceId, uuid);

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

    const deviceKey = await getDeviceKey();
    try {
      const createdDevice = await photosDeviceService.createDevice(deviceKey);
      await persist(createdDevice.uuid);
      logger.info(
        TAG,
        `Created device folder uuid=${createdDevice.uuid} key="${createdDevice.plainName}" bucket=${createdDevice.bucket}`,
      );
      return parseDeviceInfo(createdDevice);
    } catch (err) {
      if (err instanceof PhotoDeviceNameConflictError) {
        logger.info(TAG, `Device key "${deviceKey}" already exists (409) — adopting by key`);
        const devices = await photosDeviceService.listDevices();
        const device = devices.find((device) => device.plainName === deviceKey && device.status === 'EXISTS');
        if (device) {
          await persist(device.uuid);
          logger.info(TAG, `Adopted device folder uuid=${device.uuid} bucket=${device.bucket}`);
          return parseDeviceInfo(device);
        }
      }
      throw err;
    }
  }
}

export const PhotoDeviceManager = new PhotoDeviceManagerService();
