import { AsyncStorage } from 'react-native';

export const deviceStorage = {
  async saveItem(key: string, value: any) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
    }
  },

  async getItem(key: string) {
    try {
      const value = await AsyncStorage.getItem(key);

      return value;
    } catch (error) {
    }
  },

  async deleteItem(key: string) {
    try {
      const value = await AsyncStorage.removeItem(key);

      return value;
    } catch (error) {
    }
  }
};
