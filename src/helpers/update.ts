/* eslint-disable no-console */
import * as Updates from 'expo-updates';
import { deviceStorage } from './deviceStorage';

const CHECK_UPDATES_INTERVAL = 5 * 1000 * 60; // One minute

export async function shouldForceUpdate(): Promise<boolean> {
  return deviceStorage
    .getItem('lastUpdateCheck')
    .then((result) => result === null)
    .catch(() => true);
}

export async function shouldCheckUpdates(): Promise<boolean> {
  return false;
  const shouldCheck = await deviceStorage
    .getItem('lastUpdateCheck')
    .then((lastCheckTimeString) => {
      if (lastCheckTimeString === null) {
        // First time app opened
        return true;
      }

      const lastCheckTime = parseInt(lastCheckTimeString, 10);
      const currentTime = Date.now();

      const diff = currentTime - lastCheckTime;

      if (diff > CHECK_UPDATES_INTERVAL) {
        return true;
      }

      setUpdatesChecked();
      return false;
    })
    .catch(() => true);

  return shouldCheck;
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
    console.log('Failed to update', err.message);
  }
}
