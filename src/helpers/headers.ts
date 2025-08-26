import appService from '@internxt-mobile/services/AppService';
import PackageJson from '../../package.json';
import asyncStorage from '../services/AsyncStorageService';
import { AsyncStorageKey } from '../types';

export async function getHeaders(authToken?: string): Promise<Headers> {
  let storedAuthToken;

  if (!authToken) {
    storedAuthToken = await asyncStorage.getItem(AsyncStorageKey.Token);
  } else {
    storedAuthToken = authToken;
  }

  const headers = new Headers();

  headers.append('Content-Type', 'application/json');
  headers.append('internxt-version', appService.version);
  headers.append('x-internxt-desktop-header', appService.constants.CLOUDFLARE_TOKEN);
  headers.append('internxt-client', PackageJson.name);

  if (storedAuthToken) {
    headers.append('Authorization', `Bearer ${storedAuthToken}`);
  }

  return headers;
}
