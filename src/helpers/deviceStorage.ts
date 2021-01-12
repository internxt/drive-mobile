import { AsyncStorage } from 'react-native';

export const deviceStorage = {
  async saveItem(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
    }
  },
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);

      return value;
    } catch (error) {
      return null
    }
  },
  async deleteItem(key: string): Promise<void> {
    try {
      const value = await AsyncStorage.removeItem(key);

      return value;
    } catch (error) {
    }
  }
};
