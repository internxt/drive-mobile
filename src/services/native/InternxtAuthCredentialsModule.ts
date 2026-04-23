import { NativeModules, Platform } from 'react-native';

export interface InternxtAuthCredentials {
  bearerToken: string;
  userId: string;
  bridgeUser: string;
  rootFolderUuid: string;
  email?: string | null;
  driveBaseUrl: string;
  bridgeBaseUrl: string;
  desktopToken?: string | null;
}

interface NativeBridge {
  setCredentials(creds: InternxtAuthCredentials): Promise<void>;
  clearCredentials(): Promise<void>;
}

const bridge: NativeBridge | undefined =
  Platform.OS === 'android' ? NativeModules.InternxtAuthCredentialsModule : undefined;

const InternxtAuthCredentialsModule = {
  async setCredentials(creds: InternxtAuthCredentials): Promise<void> {
    if (!bridge) return;
    await bridge.setCredentials(creds);
  },
  async clearCredentials(): Promise<void> {
    if (!bridge) return;
    await bridge.clearCredentials();
  },
};

export default InternxtAuthCredentialsModule;
