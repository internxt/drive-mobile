import { openHostApp } from 'expo-share-extension';

import { AppPaths } from '../../navigation/AppLinks';
import { AppGroupPendingShareService, PendingShareFile } from '../../services/AppGroupPendingShareService';
import errorService from '../../services/ErrorService';
import { SharedFile } from '../types';

const toPendingShareFiles = (sharedFiles: SharedFile[]): PendingShareFile[] =>
  sharedFiles.flatMap((sharedFile) =>
    sharedFile.fileName === null ? [] : [{ uri: sharedFile.uri, name: sharedFile.fileName, size: sharedFile.size }],
  );

/**
 * Saves the shared files as the pending share of the App Group and opens the app on the sign in screen.
 * The sign in screen opens even when saving fails.
 */
export const savePendingShareAndOpenLogin = async (sharedFiles: SharedFile[]): Promise<void> => {
  try {
    await AppGroupPendingShareService.update({ files: toPendingShareFiles(sharedFiles), timestamp: Date.now() });
  } catch (error) {
    errorService.reportError(error, { extra: { message: 'Failed to save the pending share before sign in' } });
  }
  openHostApp(AppPaths.signIn());
};
