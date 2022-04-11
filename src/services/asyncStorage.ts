import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKey, User } from '../types';

const { getItem, setItem, removeItem, getAllKeys, multiRemove } = AsyncStorage;

export const asyncStorage = {
  saveItem(key: string, value: string): Promise<void> {
    return setItem(key, value).catch(() => undefined);
  },
  getItem(key: string): Promise<string | null> {
    return getItem(key).catch(() => null);
  },
  deleteItem(key: string): Promise<void> {
    return removeItem(key).catch(() => undefined);
  },
  getUser(): Promise<User> {
    return getItem(AsyncStorageKey.User)
      .then((value) => {
        return value ? JSON.parse(value) : null;
      })
      .catch(() => {
        return null;
      });
  },
  listItems(): Promise<readonly string[]> {
    return getAllKeys();
  },
  clearStorage(): Promise<void> {
    return multiRemove([AsyncStorageKey.User, AsyncStorageKey.Token, AsyncStorageKey.PhotosToken]);
  },
};
