import { NativeModules } from 'react-native';
import { logger } from '../common';

interface NativeBridge {
  notifyParentChanged(parentFolderUuid: string): Promise<void>;
}

const bridge: NativeBridge | undefined = NativeModules.InternxtSignalingModule;

/**
 * Signals the native file browser that a folder's children changed after a mutation originated
 * in the React Native app (upload, create, move, rename, trash, restore): the Android SAF
 * DocumentsProvider re-queries the parent; the iOS File Provider re-evaluates the parent against
 * its child snapshot, so add/rename/move/trash all refresh Files.app live through a single call.
 *
 * Best-effort and cross-platform: no-op when the native module is unavailable, never throws to
 * the caller and never invokes the native side with a malformed uuid.
 */
export async function notifyParentChanged(parentFolderUuid: string): Promise<void> {
  if (!bridge) return;
  if (typeof parentFolderUuid !== 'string' || parentFolderUuid.length === 0) return;
  try {
    await bridge.notifyParentChanged(parentFolderUuid);
  } catch (error) {
    logger.warn('InternxtSignalingModule.notifyParentChanged failed', error);
  }
}
