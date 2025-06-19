import { logger } from '@internxt-mobile/services/common';
import * as SecureStore from 'expo-secure-store';
import { AsyncStorageKey } from '../types';

const CRITICAL_USER_FIELDS = ['mnemonic', 'privateKey', 'publicKey', 'keys', 'revocationKey', 'revocateKey'];
const MAX_CHUNK_SIZE = 1800;

class SecureStorageService {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isUserKey(key)) {
        await this.setUserData(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
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
        return await SecureStore.getItemAsync(key);
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
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      logger.error(`Error deleting secure item ${key}:`, error);
    }
  }

  async hasItem(key: string): Promise<boolean> {
    try {
      if (this.isUserKey(key)) {
        const dataExists = await SecureStore.getItemAsync(`${key}_data`);
        if (dataExists) return true;

        const chunksExists = await SecureStore.getItemAsync(`${key}_data_chunks`);
        return chunksExists !== null;
      } else {
        const value = await SecureStore.getItemAsync(key);
        return value !== null;
      }
    } catch (error) {
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

  private async setLargeValue(key: string, value: string): Promise<void> {
    const valueBytes = this.getStringByteSize(value);

    if (valueBytes <= MAX_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      logger.info(`Saved ${key} (${valueBytes}bytes)`);
    } else {
      const chunks = [];
      for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
        chunks.push(value.slice(i, i + MAX_CHUNK_SIZE));
      }
      await SecureStore.setItemAsync(`${key}_chunks`, chunks.length.toString());

      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }

      logger.info(`Saved ${key} in ${chunks.length} chunks (${valueBytes}bytes total)`);
    }
  }

  private async getLargeValue(key: string): Promise<string | null> {
    try {
      const singleValue = await SecureStore.getItemAsync(key);
      if (singleValue) {
        return singleValue;
      }

      const chunksNumber = await SecureStore.getItemAsync(`${key}_chunks`);
      if (!chunksNumber) {
        return null;
      }

      const chunksCount = parseInt(chunksNumber);
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
    } catch (error) {
      logger.error(`Error getting large value ${key}:`, error);
      return null;
    }
  }

  private async removeLargeValue(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);

      const chunksNumber = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunksNumber) {
        const chunksCount = parseInt(chunksNumber);
        await SecureStore.deleteItemAsync(`${key}_chunks`);
        for (let i = 0; i < chunksCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }
    } catch (error) {
      logger.error(`Error removing large value ${key}:`, error);
    }
  }

  private isUserKey(key: string): boolean {
    return key === AsyncStorageKey.User;
  }

  private getStringByteSize(str: string): number {
    return new Blob([str]).size;
  }

  private async setUserData(key: string, value: string): Promise<void> {
    try {
      const userData = JSON.parse(value);

      for (const field of CRITICAL_USER_FIELDS) {
        if (userData[field] !== undefined) {
          if (field === 'keys' && typeof userData[field] === 'object') {
            const keysObject = userData[field];

            if (keysObject.ecc) {
              if (keysObject.ecc.privateKey) {
                await this.setLargeValue(`${key}_keys_ecc_privateKey`, keysObject.ecc.privateKey);
              }
              if (keysObject.ecc.publicKey) {
                await this.setLargeValue(`${key}_keys_ecc_publicKey`, keysObject.ecc.publicKey);
              }
            }

            if (keysObject.kyber) {
              if (keysObject.kyber.privateKey) {
                await this.setLargeValue(`${key}_keys_kyber_privateKey`, keysObject.kyber.privateKey);
              }
              if (keysObject.kyber.publicKey) {
                await this.setLargeValue(`${key}_keys_kyber_publicKey`, keysObject.kyber.publicKey);
              }
            }
          } else {
            await this.setLargeValue(`${key}_${field}`, JSON.stringify(userData[field]));
          }
        }
      }

      const cleanUserData = { ...userData };
      CRITICAL_USER_FIELDS.forEach((field) => {
        delete cleanUserData[field];
      });

      const cleanDataStr = JSON.stringify(cleanUserData);

      const cleanDataBytes = this.getStringByteSize(cleanDataStr);
      if (cleanDataBytes > MAX_CHUNK_SIZE) {
        logger.warn(`Clean user data is large (${cleanDataBytes}b), using chunks for safety`);
        await this.setLargeValue(`${key}_data`, cleanDataStr);
      } else {
        await SecureStore.setItemAsync(`${key}_data`, cleanDataStr);
      }

      logger.info(
        `User data saved: ${
          CRITICAL_USER_FIELDS.filter((critialField) => userData[critialField]).length
        } critical fields + clean data (${cleanDataBytes}bytes)`,
      );
    } catch (error) {
      logger.error(`Error setting user data for ${key}:`, error);
      throw error;
    }
  }

  private async getUserData(key: string): Promise<string | null> {
    try {
      let cleanDataStr = await SecureStore.getItemAsync(`${key}_data`);

      if (!cleanDataStr) {
        cleanDataStr = await this.getLargeValue(`${key}_data`);
      }

      if (!cleanDataStr) {
        return null;
      }

      const userData = JSON.parse(cleanDataStr);

      for (const field of CRITICAL_USER_FIELDS) {
        if (field === 'keys') {
          const eccPrivateKey = await this.getLargeValue(`${key}_keys_ecc_privateKey`);
          const eccPublicKey = await this.getLargeValue(`${key}_keys_ecc_publicKey`);
          const kyberPrivateKey = await this.getLargeValue(`${key}_keys_kyber_privateKey`);
          const kyberPublicKey = await this.getLargeValue(`${key}_keys_kyber_publicKey`);

          if (eccPrivateKey || eccPublicKey || kyberPrivateKey || kyberPublicKey) {
            userData.keys = {};

            if (eccPrivateKey || eccPublicKey) {
              userData.keys.ecc = {};
              if (eccPrivateKey) userData.keys.ecc.privateKey = eccPrivateKey;
              if (eccPublicKey) userData.keys.ecc.publicKey = eccPublicKey;
            }

            if (kyberPrivateKey || kyberPublicKey) {
              userData.keys.kyber = {};
              if (kyberPrivateKey) userData.keys.kyber.privateKey = kyberPrivateKey;
              if (kyberPublicKey) userData.keys.kyber.publicKey = kyberPublicKey;
            }
          }
        } else {
          try {
            const fieldData = await this.getLargeValue(`${key}_${field}`);
            if (fieldData) {
              userData[field] = JSON.parse(fieldData);
            }
          } catch (error) {
            logger.warn(`Could not restore critical field ${field}:`, error);
          }
        }
      }

      return JSON.stringify(userData);
    } catch (error) {
      logger.error(`Error getting user data for ${key}:`, error);
      return null;
    }
  }

  private async removeUserData(key: string): Promise<void> {
    try {
      for (const field of CRITICAL_USER_FIELDS) {
        if (field === 'keys') {
          await this.removeLargeValue(`${key}_keys_ecc_privateKey`);
          await this.removeLargeValue(`${key}_keys_ecc_publicKey`);
          await this.removeLargeValue(`${key}_keys_kyber_privateKey`);
          await this.removeLargeValue(`${key}_keys_kyber_publicKey`);
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
}

const secureStorageService = new SecureStorageService();
export default secureStorageService;
