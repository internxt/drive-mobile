import { Drive } from '@internxt/sdk';
import Constants from 'expo-constants';
import packageJson from '../../../package.json';

interface ShareSdkManagerApiSecurity {
  newToken: string;
}

const getEnv = () => {
  const extra = Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {};
  return extra as { DRIVE_NEW_API_URL: string; CLOUDFLARE_TOKEN?: string };
};

const getAppDetails = () => ({
  clientName: packageJson.name,
  clientVersion: packageJson.version.replace('v', ''),
  desktopHeader: getEnv().CLOUDFLARE_TOKEN ?? '',
});

class ShareSdkManager {
  private static apiSecurity?: ShareSdkManagerApiSecurity;
  private static storageClient?: ReturnType<typeof Drive.Storage.client>;

  static init(apiSecurity: ShareSdkManagerApiSecurity) {
    this.apiSecurity = apiSecurity;
    this.storageClient = undefined;
  }

  static get storageV2() {
    if (!this.apiSecurity) throw new Error('ShareSdkManager not initialized');
    if (!this.storageClient) {
      this.storageClient = Drive.Storage.client(getEnv().DRIVE_NEW_API_URL, getAppDetails(), {
        token: this.apiSecurity.newToken,
      });
    }
    return this.storageClient;
  }
}

export default ShareSdkManager;
