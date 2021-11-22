import { AsyncStorage } from 'react-native';
import { notify } from './toast';

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
  // eslint-disable-next-line camelcase
  root_folder_id: string;
  teams: boolean;
  userId: string;
  uuid: string;
}

type Token = string;

export const deviceStorage = {
  saveItem(key: string, value: string): Promise<void> {
    return setItem(key, value).catch((err) => null);
  },
  getItem(key: string): Promise<string | null> {
    return getItem(key).catch((err) => null);
  },
  deleteItem(key: string): Promise<void> {
    return removeItem(key).catch((err) => null);
  },
  getUser(): Promise<User> {
    return getItem('xUser')
      .then((value) => {
        return value ? JSON.parse(value) : null;
      })
      .catch((err) => {
        notify({ type: 'success', text: err.message });
        return null;
      });
  },
  getToken(): Promise<Token> {
    return getItem('xToken').catch((err) => {
      notify({ type: 'error', text: err.message });
      return null;
    });
  },
  listItems(): Promise<string[]> {
    return getAllKeys();
  },
  clearStorage(): Promise<void> {
    return clear();
  }
};
