import { AsyncStorage } from 'react-native';

const { getItem, setItem, removeItem } = AsyncStorage;

export interface User {
  bucket: string,
  createdAt: string,
  credit: number,
  email: string,
  lastname: string,
  mnemonic: string,
  name: string,
  privateKey: string,
  publicKey: string,
  registerCompleted: boolean,
  revocateKey: string,
  // eslint-disable-next-line camelcase
  root_folder_id: string,
  teams: boolean,
  userId: string,
  uuid: string
}

type Token = string;

export const deviceStorage = {
  saveItem(key: string, value: string): Promise<void> {
    return setItem(key, value).catch(err => null);
  },
  getItem(key: string): Promise<string | null> {
    return getItem(key).catch(err => null);
  },
  deleteItem(key: string): Promise<void> {
    return removeItem(key).catch(err => null);
  },
  getUser(): Promise<User> {
    return getItem('xUser').then(JSON.parse).catch(err => null);
  },
  getToken(): Promise<Token> {
    return getItem('xToken').then(JSON.parse).catch(err => null);
  }
}
