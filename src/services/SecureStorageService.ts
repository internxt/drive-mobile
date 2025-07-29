import { logger } from '@internxt-mobile/services/common';
import * as SecureStore from 'expo-secure-store';
import { AsyncStorageKey } from '../types';
import { UserData, UserKeysHandler } from './UserKeysHandler';

const CRITICAL_USER_FIELDS = ['mnemonic', 'privateKey', 'publicKey', 'keys', 'revocationKey', 'revocateKey'];

class SecureStorageService {
  private readonly MAX_CHUNK_SIZE = 1800;
  private readonly keysHandler: UserKeysHandler;

  constructor() {
    this.keysHandler = new UserKeysHandler(
      this.setLargeValue.bind(this),
      this.getLargeValue.bind(this),
      this.removeLargeValue.bind(this),
    );
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isUserKey(key)) {
        await this.setUserData(key, value);
      } else {
        await this.setLargeValue(key, value);
      }
    } catch (error) {
      logger.error(`Error saving secure item ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isUserKey(key)) {
        return await this.getUserData(key);
      } else {
        return await this.getLargeValue(key);
      }
    } catch (error) {
      logger.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isUserKey(key)) {
        await this.removeUserData(key);
      } else {
        await this.removeLargeValue(key);
      }
    } catch (error) {
      logger.error(`Error deleting secure item ${key}:`, error);
    }
  }

  async hasItem(key: string): Promise<boolean> {
    try {
      if (this.isUserKey(key)) {
        return await this.userDataExists(key);
      } else {
        return await this.valueExists(key);
      }
    } catch (error) {
      logger.info(`Key ${key} not exist in secure storage`);
      return false;
    }
  }

  async removeMultipleItems(keys: string[]): Promise<void> {
    const promises = keys.map((key) => this.removeItem(key));
    await Promise.all(promises);
    logger.info(`Removed ${keys.length} secure items`);
  }

  async getExistingItems(keys: string[]): Promise<string[]> {
    const existingItems: string[] = [];
    for (const key of keys) {
      if (await this.hasItem(key)) {
        existingItems.push(key);
      }
    }
    return existingItems;
  }
  // HANDLE USER DATA FUNCTIONS

  private async setUserData(key: string, value: string): Promise<void> {
    try {
      const userData: UserData = JSON.parse(value);

      await this.saveCriticalFields(key, userData);
      await this.saveCleanUserData(key, userData);

      this.logUserDataSaved(userData);
    } catch (error) {
      logger.error(`Error setting user data for ${key}:`, error);
      throw error;
    }
  }

  private async getUserData(key: string): Promise<string | null> {
    try {
      const cleanDataStr = await this.getLargeValue(`${key}_data`);
      if (!cleanDataStr) {
        return null;
      }

      const userData: UserData = JSON.parse(cleanDataStr);
      await this.restoreCriticalFields(key, userData);

      return JSON.stringify(userData);
    } catch (error) {
      logger.error(`Error getting user data for ${key}:`, error);
      return null;
    }
  }

  private async saveCriticalFields(key: string, userData: UserData): Promise<void> {
    for (const field of CRITICAL_USER_FIELDS) {
      const fieldValue = userData[field];
      if (fieldValue === undefined) continue;

      if (field === 'keys' && this.keysHandler.isKeysObject(fieldValue)) {
        await this.keysHandler.saveKeysField(key, fieldValue);
      } else {
        await this.setLargeValue(`${key}_${field}`, JSON.stringify(fieldValue));
      }
    }
  }

  private async restoreCriticalFields(key: string, userData: UserData): Promise<void> {
    for (const field of CRITICAL_USER_FIELDS) {
      if (field === 'keys') {
        await this.keysHandler.restoreKeysField(key, userData);
      } else {
        await this.restoreSimpleField(key, field, userData);
      }
    }
  }

  private async restoreSimpleField(key: string, field: string, userData: UserData): Promise<void> {
    try {
      const fieldData = await this.getLargeValue(`${key}_${field}`);
      if (fieldData) {
        userData[field] = JSON.parse(fieldData);
      }
    } catch (error) {
      logger.warn(`Could not restore critical field ${field}:`, error);
    }
  }

  private async saveCleanUserData(key: string, userData: UserData): Promise<void> {
    const cleanUserData = this.getCleanUserData(userData);
    const cleanDataStr = JSON.stringify(cleanUserData);

    await this.setLargeValue(`${key}_data`, cleanDataStr);
  }

  private async removeUserData(key: string): Promise<void> {
    try {
      for (const field of CRITICAL_USER_FIELDS) {
        if (field === 'keys') {
          await this.keysHandler.removeKeys(key);
        } else {
          await this.removeLargeValue(`${key}_${field}`);
        }
      }

      await this.removeLargeValue(`${key}_data`);
      logger.info(`User data deleted: ${key} (all fields and chunks)`);
    } catch (error) {
      logger.error(`Error removing user data for ${key}:`, error);
    }
  }

  // HANDLE CHUNKS FUNCTIONS

  private async setLargeValue(key: string, value: string): Promise<void> {
    const valueBytes = this.getStringByteSize(value);

    if (valueBytes <= this.MAX_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      logger.info(`Saved ${key} (${valueBytes}b)`);
    } else {
      await this.storeValueInChunks(key, value, valueBytes);
    }
  }

  private async storeValueInChunks(key: string, value: string, valueBytes: number): Promise<void> {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += this.MAX_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + this.MAX_CHUNK_SIZE));
    }

    await SecureStore.setItemAsync(`${key}_chunks`, chunks.length.toString());

    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }

    logger.info(`Saved ${key} in ${chunks.length} chunks (${valueBytes}b total)`);
  }

  private async getLargeValue(key: string): Promise<string | null> {
    try {
      const singleValue = await SecureStore.getItemAsync(key);
      if (singleValue) {
        return singleValue;
      }

      return await this.reconstructFromChunks(key);
    } catch (error) {
      logger.error(`Error getting large value ${key}:`, error);
      return null;
    }
  }

  private async reconstructFromChunks(key: string): Promise<string | null> {
    const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunksCountStr) {
      return null;
    }

    const chunksCount = parseInt(chunksCountStr, 10);
    const chunks: string[] = [];

    for (let i = 0; i < chunksCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk) {
        chunks.push(chunk);
      } else {
        logger.error(`Missing chunk ${i} for ${key}`);
        return null;
      }
    }

    return chunks.join('');
  }

  private async removeLargeValue(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);

      const chunksCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunksCountStr) {
        const chunksCount = parseInt(chunksCountStr, 10);
        await SecureStore.deleteItemAsync(`${key}_chunks`);

        for (let i = 0; i < chunksCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }
    } catch (error) {
      logger.error(`Error removing large value ${key}:`, error);
    }
  }

  // CHECK DATA FUNCTIONS
  private async userDataExists(key: string): Promise<boolean> {
    const dataExists = await SecureStore.getItemAsync(`${key}_data`);
    if (dataExists) return true;

    const chunksExists = await SecureStore.getItemAsync(`${key}_data_chunks`);
    return chunksExists !== null;
  }

  private async valueExists(key: string): Promise<boolean> {
    const singleValue = await SecureStore.getItemAsync(key);
    if (singleValue) return true;

    const chunksExists = await SecureStore.getItemAsync(`${key}_chunks`);
    return chunksExists !== null;
  }

  // AUXILIAR FUNCTIONS

  private isUserKey(key: string): boolean {
    return key === AsyncStorageKey.User;
  }

  private getStringByteSize(str: string): number {
    return new Blob([str]).size;
  }

  private getCleanUserData(userData: UserData): Omit<UserData, (typeof CRITICAL_USER_FIELDS)[number]> {
    const cleanUserData = { ...userData };
    CRITICAL_USER_FIELDS.forEach((field) => {
      delete cleanUserData[field];
    });
    return cleanUserData;
  }

  private logUserDataSaved(userData: UserData): void {
    const criticalFieldsCount = CRITICAL_USER_FIELDS.filter((field) => userData[field] !== undefined).length;
    const cleanDataBytes = this.getStringByteSize(JSON.stringify(this.getCleanUserData(userData)));

    logger.info(`User data saved: ${criticalFieldsCount} critical fields + clean data (${cleanDataBytes}b)`);
  }
}

const secureStorageService = new SecureStorageService();
export default secureStorageService;
