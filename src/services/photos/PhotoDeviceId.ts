import { PhotoDevice } from '@internxt/sdk/dist/drive/photos';
import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import { HTTP_FORBIDDEN } from 'src/services/common/httpStatusCodes';
import secureStorageService from 'src/services/SecureStorageService';
import { PhotoDeviceNameConflictError } from './errors';
import { PHOTOS_DEVICE_KEY, photoDeviceIdentityStore } from './PhotoDeviceIdentityStore';
import { photosDeviceService } from './photosDeviceService';

const TAG = '[PhotoDeviceManager]';

export interface PhotoDeviceInfo {
  deviceId: string;
  plainName: string;
  bucket: string;
}

const getOrGenerateFallbackKey = async (): Promise<string> => {
  const stored = await secureStorageService.getItem(PHOTOS_DEVICE_KEY);
  if (stored) {
    return stored;
  }
  const generated = uuid.v4() as string;
  await secureStorageService.setItem(PHOTOS_DEVICE_KEY, generated);
  logger.warn(TAG, `No stable device key available — generated fallback key=${generated}`);
  return generated;
};

/**
 * Returns a stable, opaque per-device identifier.
 * - Android: androidId
 * - iOS: identifierForVendor
 * - Fallback: UUID generated once and persisted in SecureStorage
 *
 * @returns The device's unique identifier.
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

const parseDeviceInfo = (device: PhotoDevice): PhotoDeviceInfo => ({
  deviceId: device.uuid,
  plainName: device.plainName,
  bucket: device.bucket,
});

/**
 * Ensures the current device has a folder in the Photos bucket.
 * - Same email + same model = reuse the folder.
 * - Different email or different model = the stored identity is discarded, falls through to create.
 */
class PhotoDeviceManagerService {
  private pendingDeviceFolder: Promise<PhotoDeviceInfo> | null = null;

  /**
   * Ensures the current device has a folder in the Photos bucket, creating one if needed.
   * Concurrent calls while a resolution is in flight share the same result instead of
   * triggering duplicate backend calls.
   *
   * @returns The resolved device folder info.
   */
  ensureDeviceFolder(): Promise<PhotoDeviceInfo> {
    if (this.pendingDeviceFolder) {
      return this.pendingDeviceFolder;
    }
    this.pendingDeviceFolder = this.resolveDeviceFolder().finally(() => {
      this.pendingDeviceFolder = null;
    });
    return this.pendingDeviceFolder;
  }

  /**
   * Resolves the device folder: reuses a stored identity valid for the current account
   * if one exists and still exists on the backend, otherwise creates a new folder.
   *
   * @returns The resolved device folder info.
   */
  private async resolveDeviceFolder(): Promise<PhotoDeviceInfo> {
    const currentEmail = (await asyncStorageService.getUser())?.email;
    const currentModel = getDisplayName();
    logger.info(TAG, `Resolving device folder for email=${currentEmail ?? 'unknown'} model="${currentModel}"`);

    const deviceIdentity = await photoDeviceIdentityStore.getValidFor(currentEmail, currentModel);
    if (deviceIdentity) {
      const reused = await this.tryReuseCandidate(deviceIdentity.deviceId, currentEmail, currentModel);
      if (reused) {
        return reused;
      }
    } else {
      logger.info(TAG, 'No stored identity to reuse — creating device folder from scratch');
    }

    const uniqueId = await getDeviceUniqueId();
    const deviceKey = buildDeviceKey(uniqueId);
    try {
      const createdDevice = await photosDeviceService.createDevice(deviceKey);
      await this.persistIdentity(createdDevice.uuid, currentEmail, currentModel);
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
          await this.persistIdentity(device.uuid, currentEmail, currentModel);
          logger.info(TAG, `Adopted device folder uuid=${device.uuid} bucket=${device.bucket}`);
          return parseDeviceInfo(device);
        }
      }
      throw err;
    }
  }

  /**
   * Attempts to reuse a candidate device folder uuid by checking it still exists on the
   * backend. On success, re-persists the identity for the current account. On a 403,
   * clears the stored identity for the current account.
   *
   * @param candidateUuid - Backend device folder uuid to verify and reuse.
   * @param currentEmail - Email of the currently logged-in account, or undefined if unknown.
   * @param currentModel - Display name of the current device, or null if unknown.
   * @returns The reused device folder info, or null if the candidate can't be reused.
   */
  private async tryReuseCandidate(
    candidateUuid: string,
    currentEmail: string | undefined,
    currentModel: string | null,
  ): Promise<PhotoDeviceInfo | null> {
    try {
      const existingDevice = await photosDeviceService.getDevice(candidateUuid);
      if (existingDevice?.status === 'EXISTS') {
        await this.persistIdentity(existingDevice.uuid, currentEmail, currentModel);
        logger.info(
          TAG,
          `Reusing device folder uuid=${existingDevice.uuid} key="${existingDevice.plainName}" bucket=${existingDevice.bucket}`,
        );
        return parseDeviceInfo(existingDevice);
      }
      logger.warn(TAG, `Candidate uuid=${candidateUuid} not found or DELETED — recreating by key`);
      return null;
    } catch (err) {
      if (err instanceof AxiosResponseError && err.status === HTTP_FORBIDDEN) {
        logger.warn(TAG, `getDevice 403 for uuid=${candidateUuid} — device belongs to another account, clearing`);
        if (currentEmail) {
          await photoDeviceIdentityStore.clearAccount(currentEmail);
        }
        return null;
      }
      throw err;
    }
  }

  /**
   * Saves the identity binding this device folder to the current account. No-op if
   * there is no current account email to key the entry by.
   *
   * @param deviceId - Backend device folder uuid to persist.
   * @param currentEmail - Email of the currently logged-in account, or undefined if unknown.
   * @param currentModel - Display name of the current device, or null if unknown.
   * @returns A promise that resolves once the identity has been persisted (or skipped).
   */
  private async persistIdentity(
    deviceId: string,
    currentEmail: string | undefined,
    currentModel: string | null,
  ): Promise<void> {
    if (!currentEmail) {
      logger.warn(TAG, `No current account email available — skipping identity persistence for uuid=${deviceId}`);
      return;
    }
    await photoDeviceIdentityStore.save({ deviceId, email: currentEmail, model: currentModel ?? '' });
  }
}

export const PhotoDeviceManager = new PhotoDeviceManagerService();
