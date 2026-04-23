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

export async function setCredentials(creds: InternxtAuthCredentials): Promise<void> {
  if (!bridge) return;
  await bridge.setCredentials(creds);
}

export async function clearCredentials(): Promise<void> {
  if (!bridge) return;
  await bridge.clearCredentials();
}
