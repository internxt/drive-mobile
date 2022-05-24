/* eslint-disable no-console */
import * as Updates from 'expo-updates';
import asyncStorage from '../services/AsyncStorageService';
import errorService from '../services/ErrorService';

export async function shouldForceUpdate(): Promise<boolean> {
  return asyncStorage
    .getItem('lastUpdateCheck')
    .then((result) => result === null)
    .catch(() => true);
}

export function setUpdatesChecked(): Promise<void> {
  return asyncStorage.saveItem('lastUpdateCheck', new Date().getTime().toString());
}

export async function forceCheckUpdates(): Promise<void> {
  try {
    const checkUpdate = await Updates.checkForUpdateAsync();

    if (checkUpdate.isAvailable) {
      const download = await Updates.fetchUpdateAsync();

      if (download.isNew) {
        return Updates.reloadAsync();
      }
    }
    setUpdatesChecked();
  } catch (err) {
    const castedError = errorService.castError(err);

    console.log('Failed to update', castedError.message);
  }
}
