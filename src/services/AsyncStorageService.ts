import { logger } from '@internxt-mobile/services/common';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKey } from '../types';
import secureStorageService from './SecureStorageService';

const SENSITIVE_KEYS = [AsyncStorageKey.Token, AsyncStorageKey.PhotosToken, AsyncStorageKey.User];

class AsyncStorageService {
  private isSensitiveKey(key: AsyncStorageKey): boolean {
    return SENSITIVE_KEYS.includes(key);
  }

  async saveItem(key: AsyncStorageKey, value: string): Promise<void> {
    try {
      if (this.isSensitiveKey(key)) {
        await secureStorageService.setItem(key, value);
        logger.info(`Sensitive data auto-saved to SecureStore: ${key}`);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      logger.error(`Error saving item ${key}:`, error);
      return undefined;
    }
  }

  async getItem(key: AsyncStorageKey): Promise<string | null> {
    try {
      if (this.isSensitiveKey(key)) {
        return await secureStorageService.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      logger.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      if (this.isSensitiveKey(key as AsyncStorageKey)) {
        await secureStorageService.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error deleting item ${key}:`, error);
    }
  }

  async getScreenLockIsEnabled(): Promise<boolean> {
    const screenLockIsEnabledStr = await this.getItem(AsyncStorageKey.ScreenLockIsEnabled);

    return screenLockIsEnabledStr === 'true';
  }

  saveScreenLockIsEnabled(screenLockIsEnabled: boolean): Promise<void> {
    return this.saveItem(AsyncStorageKey.ScreenLockIsEnabled, screenLockIsEnabled ? 'true' : 'false');
  }

  saveLastScreenUnlock(lastScreenUnlock: Date): Promise<void> {
    return this.saveItem(AsyncStorageKey.LastScreenLock, lastScreenUnlock.toISOString());
  }

  async getLastScreenUnlock(): Promise<Date | null> {
    const lastScreenUnlock = await this.getItem(AsyncStorageKey.LastScreenLock);

    if (!lastScreenUnlock) return null;
    return new Date(lastScreenUnlock);
  }

  async getUser(): Promise<UserSettings> {
    return this.getItem(AsyncStorageKey.User).then((value) => {
      return value ? JSON.parse(value) : null;
    });
  }

  async getThemePreference(): Promise<'light' | 'dark' | null> {
    const theme = await this.getItem(AsyncStorageKey.ThemePreference);
    if (theme === 'dark' || theme === 'light') {
      return theme;
    }
    return null;
  }

  saveThemePreference(theme: 'light' | 'dark'): Promise<void> {
    return this.saveItem(AsyncStorageKey.ThemePreference, theme);
  }

  async getLastSecurityCheck(): Promise<Date | null> {
    const lastCheck = await this.getItem(AsyncStorageKey.LastSecurityCheck);
    return lastCheck ? new Date(lastCheck) : null;
  }

  saveLastSecurityCheck(date: Date): Promise<void> {
    return this.saveItem(AsyncStorageKey.LastSecurityCheck, date.toISOString());
  }

  /**
   * Gets the screen protection preference (prevents screenshots/screen recording)
   * @returns {Promise<boolean>} true if protection is enabled, defaults to true for security if not set
   */
  async getScreenProtectionEnabled(): Promise<boolean> {
    const screenProtectionEnabled = await this.getItem(AsyncStorageKey.ScreenProtectionEnabled);

    return screenProtectionEnabled === null ? true : screenProtectionEnabled === 'true';
  }

  saveScreenProtectionEnabled(enabled: boolean): Promise<void> {
    return this.saveItem(AsyncStorageKey.ScreenProtectionEnabled, enabled.toString());
  }

  async clearStorage(): Promise<void> {
    try {
      const nonSensitiveKeys = [
        AsyncStorageKey.LastPhotoPulledDate,
        AsyncStorageKey.ScreenLockIsEnabled,
        AsyncStorageKey.LastScreenLock,
        AsyncStorageKey.ThemePreference,
        AsyncStorageKey.Language,
      ];

      await AsyncStorage.multiRemove(nonSensitiveKeys);
      await secureStorageService.removeMultipleItems(SENSITIVE_KEYS);

      logger.info('All storage cleaned (AsyncStorage + SecureStore)');
    } catch (error) {
      logger.error('Error clearing storage:', error);
      throw error;
    }
  }

  async migrateToSecureStorage(): Promise<void> {
    try {
      logger.info('Starting migration to secure storage...');
      let migratedCount = 0;

      for (const key of SENSITIVE_KEYS) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            await secureStorageService.setItem(key, value);
            await AsyncStorage.removeItem(key);
            migratedCount++;
            logger.info(`Migrated ${key} to SecureStore`);
          } else {
            logger.info(`No data found for ${key} in AsyncStorage`);
          }
        } catch (error) {
          logger.error(`Error migrating ${key}:`, error);
        }
      }

      logger.info(`Migration completed! ${migratedCount} items migrated to SecureStore`);

      await this.verifyMigration();
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  private async verifyMigration(): Promise<void> {
    logger.info('Verifying migration...');

    const issues: string[] = [];

    for (const key of SENSITIVE_KEYS) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        issues.push(`${key} still found in AsyncStorage`);
      }
    }
    const existingInSecure = await secureStorageService.getExistingItems(SENSITIVE_KEYS);

    if (issues.length === 0) {
      logger.info(`Migration verification passed! ${existingInSecure.length} items in SecureStore`);
      if (existingInSecure.includes('xUser')) {
        logger.info('User data successfully split and stored in SecureStore');
      }
    } else {
      logger.warn('Migration verification found issues:', issues);
    }
  }

  async checkNeedsMigration(): Promise<{ needsMigration: boolean; itemsToMigrate: string[] }> {
    const itemsToMigrate: string[] = [];

    for (const key of SENSITIVE_KEYS) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        itemsToMigrate.push(key);
      }
    }

    const needsMigration = itemsToMigrate.length > 0;
    if (needsMigration) {
      logger.info(`Migration needed for: ${itemsToMigrate.join(', ')}`);
    } else {
      logger.info('No migration needed');
    }

    return { needsMigration, itemsToMigrate };
  }
}

const asyncStorageService = new AsyncStorageService();
export default asyncStorageService;
