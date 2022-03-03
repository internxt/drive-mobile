import { deviceStorage } from '../services/asyncStorage';
import PackageJson from '../../package.json';

export async function getHeaders(authToken?: string, mnemonic?: string): Promise<Headers> {
  let storedAuthToken;

  if (!authToken) {
    storedAuthToken = await deviceStorage.getToken();
  } else {
    storedAuthToken = authToken;
  }

  let storedMnemonic;

  if (!mnemonic) {
    const xUser = await deviceStorage.getUser();

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
