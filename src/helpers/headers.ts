import { asyncStorage } from '../services/AsyncStorageService';
import PackageJson from '../../package.json';
import { AsyncStorageKey } from '../types';

export async function getHeaders(authToken?: string, mnemonic?: string): Promise<Headers> {
  let storedAuthToken;

  if (!authToken) {
    storedAuthToken = await asyncStorage.getItem(AsyncStorageKey.Token);
  } else {
    storedAuthToken = authToken;
  }

  let storedMnemonic;

  if (!mnemonic) {
    const xUser = await asyncStorage.getUser();

    storedMnemonic = xUser && xUser.mnemonic;
  } else {
    storedMnemonic = mnemonic;
  }

  const headers = new Headers();

  headers.append('content-type', 'application/json; charset=utf-8');
  headers.append('internxt-version', PackageJson.version);
  headers.append('internxt-client', 'drive-mobile');

  headers.append('Authorization', `Bearer ${storedAuthToken}`);
  headers.append('internxt-mnemonic', storedMnemonic);

  return headers;
}
