/* eslint-disable no-console */
import * as Updates from 'expo-updates';
import { deviceStorage } from '../services/asyncStorage';
import errorService from '../services/error';

export async function shouldForceUpdate(): Promise<boolean> {
  return deviceStorage
    .getItem('lastUpdateCheck')
    .then((result) => result === null)
    .catch(() => true);
}

export function setUpdatesChecked(): Promise<void> {
  return deviceStorage.saveItem('lastUpdateCheck', new Date().getTime().toString());
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
