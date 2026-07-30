import { logger } from 'src/services/common';
import secureStorageService from 'src/services/SecureStorageService';

const TAG = '[PhotoDeviceIdentityStore]';

const PHOTOS_DEVICE_IDENTITY_KEY = 'photos-device-identity';
export const PHOTOS_DEVICE_KEY = 'photos-device-key';

const MAX_ACCOUNTS = 3;

export interface PhotoDeviceIdentity {
  deviceId: string;
  email: string;
  model: string;
}

/**
 * Persists the binding between a backend device folder and the account that created
 * it, for up to MAX_ACCOUNTS accounts on this phone.
 */
class PhotoDeviceIdentityStore {
  /**
   * Saves or updates the identity for `deviceIdentity.email`.
   * If the account is already stored, its previous entry is replaced. If
   * saving pushes the store past MAX_ACCOUNTS, the least recently used entry is evicted.
   *
   * @param deviceIdentity - The device identity to persist.
   * @returns A promise that resolves once the entry has been written.
   */
  async save(deviceIdentity: PhotoDeviceIdentity): Promise<void> {
    const deviceIdentities = await this.readEntries();
    const withoutCurrentAccount = deviceIdentities.filter((entry) => entry.email !== deviceIdentity.email);
    const newDeviceIdentityEntries = [deviceIdentity, ...withoutCurrentAccount];
    const updatedEntries = newDeviceIdentityEntries.slice(0, MAX_ACCOUNTS);

    const evictedEntries = newDeviceIdentityEntries.slice(MAX_ACCOUNTS);
    if (evictedEntries.length > 0) {
      logger.info(
        TAG,
        `Saved identity for ${deviceIdentity.email} — evicted least recently used account(s): ${evictedEntries.map((e) => e.email).join(', ')}`,
      );
    } else {
      logger.info(
        TAG,
        `Saved identity for ${deviceIdentity.email} deviceId=${deviceIdentity.deviceId} (${updatedEntries.length}/${MAX_ACCOUNTS} accounts cached)`,
      );
    }

    await this.writeEntries(updatedEntries);
  }

  /**
   * Returns the stored entry for `currentEmail` only if its model matches `currentModel`.
   * - No entry for this email: returns null, nothing is changed.
   * - Entry found but model doesn't match: that entry is discarded (other accounts' entries
   *   are left untouched) and null is returned.
   * - Entry found and matches: it's promoted to most-recently-used and returned.
   * - `currentEmail` is undefined: returns null without touching anything.
   *
   * @param currentEmail - Email of the currently logged-in account, or undefined if unknown.
   * @param currentModel - Display name of the current device, or null if unknown.
   * @returns The matching identity, or null if there is none valid for this account/hardware.
   */
  async getValidFor(
    currentEmail: string | undefined,
    currentModel: string | null,
  ): Promise<PhotoDeviceIdentity | null> {
    if (!currentEmail) {
      logger.warn(TAG, 'No current account email available — cannot validate stored identities');
      return null;
    }

    const photoDeviceIdentities = await this.readEntries();
    const currentIdentityIndex = photoDeviceIdentities.findIndex((entry) => entry.email === currentEmail);
    if (currentIdentityIndex === -1) {
      logger.info(
        TAG,
        `No stored identity for ${currentEmail} on this phone (${photoDeviceIdentities.length} other account(s) cached)`,
      );
      return null;
    }

    const currentIdentity = photoDeviceIdentities[currentIdentityIndex];
    const restIdentities = photoDeviceIdentities.filter((_, i) => i !== currentIdentityIndex);

    if (currentIdentity.model !== currentModel) {
      logger.info(
        TAG,
        `Stored identity for ${currentEmail} has a different device model (stored="${currentIdentity.model}" current="${currentModel}") — discarding stale entry`,
      );
      await this.writeEntries(restIdentities);
      return null;
    }

    logger.info(
      TAG,
      `Stored identity matches for ${currentEmail} deviceId=${currentIdentity.deviceId} model="${currentIdentity.model}" — promoting to most recently used`,
    );
    await this.writeEntries([currentIdentity, ...restIdentities]);
    return currentIdentity;
  }

  /**
   * Removes the stored entry for a single account, leaving the other accounts' entries intact.
   *
   * @param email - Email of the account whose entry should be removed.
   * @returns A promise that resolves once the entry has been removed.
   */
  async clearAccount(email: string): Promise<void> {
    const photoDeviceIdentities = await this.readEntries();
    const updatedDeviceIdentities = photoDeviceIdentities.filter((entry) => entry.email !== email);
    if (updatedDeviceIdentities.length !== photoDeviceIdentities.length) {
      await this.writeEntries(updatedDeviceIdentities);
    }
  }

  /**
   * Wipes every stored entry for every account on this phone.
   *
   * @returns A promise that resolves once the storage key has been removed.
   */
  async clearAll(): Promise<void> {
    await secureStorageService.removeItem(PHOTOS_DEVICE_IDENTITY_KEY);
  }

  /**
   * Reads and parses the stored entries.
   *
   * @returns The stored identities, most recently used first, or an empty array if there are
   * none or the stored value is corrupted.
   */
  private async readEntries(): Promise<PhotoDeviceIdentity[]> {
    const storedDeviceIdentities = await secureStorageService.getItem(PHOTOS_DEVICE_IDENTITY_KEY);
    if (!storedDeviceIdentities) {
      return [];
    }

    try {
      const parsedDeviceIdentities = JSON.parse(storedDeviceIdentities);
      return Array.isArray(parsedDeviceIdentities) ? parsedDeviceIdentities : [];
    } catch (error) {
      logger.warn(TAG, 'Failed to parse stored identities, resetting', { error });
      await this.clearAll();
      return [];
    }
  }

  /**
   * Persists the given entries, or clears the storage key entirely if the list is empty.
   *
   * @param photoDeviceIdentities - The identities to persist, most recently used first.
   * @returns A promise that resolves once the entries have been written.
   */
  private async writeEntries(photoDeviceIdentities: PhotoDeviceIdentity[]): Promise<void> {
    if (photoDeviceIdentities.length === 0) {
      await this.clearAll();
      return;
    }
    await secureStorageService.setItem(PHOTOS_DEVICE_IDENTITY_KEY, JSON.stringify(photoDeviceIdentities));
  }
}

export const photoDeviceIdentityStore = new PhotoDeviceIdentityStore();
