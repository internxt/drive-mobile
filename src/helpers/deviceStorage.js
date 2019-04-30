import { AsyncStorage } from "react-native";

export const deviceStorage = {
  async saveItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log("AsyncStorage saveItem Error: " + error.message);
    }
  },

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.log("AsyncStorage getItem Error: " + error.message);
    }
  },

  async deleteItem(key) {
    try {
      const value = await AsyncStorage.removeItem(key);
      return value;
    } catch (error) {
      console.log("AsyncStorage deleteItem Error: " + error.message);
    }
  }
};
