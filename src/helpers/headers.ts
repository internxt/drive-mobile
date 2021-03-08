import { deviceStorage } from './deviceStorage'
import PackageJson from '../../package.json'

export async function getHeaders(authToken?: string, mnemonic?: string): Promise<Headers> {

  let storedAuthToken;

  if (!authToken) {
    storedAuthToken = await deviceStorage.getItem('xToken')
  }

  let storedMnemonic;

  if (!mnemonic) {
    const xUser = await deviceStorage.getItem('xUser')
    const xUserJson = JSON.parse(xUser || '{}')

    storedMnemonic = xUserJson.mnemonic;
  }

  const headers = new Headers()

  headers.append('content-type', 'application/json; charset=utf-8')
  headers.append('internxt-version', PackageJson.version)
  headers.append('internxt-client', 'drive-mobile')

  headers.append('Authorization', `Bearer ${authToken || storedAuthToken}`);
  headers.append('internxt-mnemonic', mnemonic || storedMnemonic);

  return headers;
}
