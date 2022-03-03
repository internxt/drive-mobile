import AsyncStorage from '@react-native-async-storage/async-storage';

const { getItem, setItem, removeItem, getAllKeys, clear } = AsyncStorage;

export interface User {
  bucket: string;
  createdAt: string;
  credit: number;
  email: string;
  username: string;
  bridgeUser: string;
  lastname: string;
  mnemonic: string;
  name: string;
  privateKey: string;
  publicKey: string;
  registerCompleted: boolean;
  revocateKey: string;
  root_folder_id: number;
  teams: boolean;
  userId: string;
  uuid: string;
}

type Token = string;

export const deviceStorage = {
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
    return getItem('xUser')
      .then((value) => {
        return value ? JSON.parse(value) : null;
      })
      .catch(() => {
        return null;
      });
  },
  getToken(): Promise<Token | null> {
    return getItem('xToken').catch(() => {
      return null;
    });
  },
  listItems(): Promise<readonly string[]> {
    return getAllKeys();
  },
  clearStorage(): Promise<void> {
    return clear();
  },
};
