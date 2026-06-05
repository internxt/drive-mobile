import { NativeModules, Platform } from 'react-native';

interface NativeBridge {
  notifyParentChanged(parentFolderUuid: string): Promise<void>;
}

const bridge: NativeBridge | undefined =
  Platform.OS === 'android' ? NativeModules.InternxtSignalingModule : undefined;

/**
 * Signals the Android file picker (SAF DocumentsProvider) that a folder's children changed
 * after a mutation originated in the React Native app (file upload, folder creation), so it
 * invalidates its cache and re-queries.
 *
 * Best-effort and cross-platform: no-op on iOS and when the native module is unavailable,
 * never throws to the caller and never invokes the native side with a malformed uuid.
 */
export async function notifyParentChanged(parentFolderUuid: string): Promise<void> {
  if (!bridge) return;
  if (typeof parentFolderUuid !== 'string' || parentFolderUuid.length === 0) return;
  await bridge.notifyParentChanged(parentFolderUuid);
}
