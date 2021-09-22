/* eslint-disable no-console */
import * as Updates from 'expo-updates';

export async function checkUpdates(): Promise<void> {

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    const checkUpdate = await Updates.checkForUpdateAsync();

    if (checkUpdate.isAvailable) {
      const download = await Updates.fetchUpdateAsync()

      if (download.isNew) {
        // await Updates.reloadAsync();
      }
    }
  } catch (err) {
    console.log('Failed to update', err.message)
  }
}