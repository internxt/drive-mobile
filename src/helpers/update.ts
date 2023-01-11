/* eslint-disable no-console */
import appService from '@internxt-mobile/services/AppService';
import { logger } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

/**
 * Check and fetch a remote update if the
 * runtime version is compatible
 */
export const getRemoteUpdateIfAvailable = async () => {
  try {
    if (appService.isDevMode) {
      logger.info('Will not check for remote updates since the app is running in DEV mode');
      return;
    }
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      logger.info('No remote update available');
      return;
    }

    logger.info('Remote update available');
    const fetchedUpdate = await Updates.fetchUpdateAsync();

    if (!fetchedUpdate.isNew) {
      return;
    }
    await Updates.reloadAsync();
  } catch (e) {
    errorService.reportError(e, {
      extra: {
        currentRuntimeVersion: Updates.runtimeVersion,
      },
    });
  }
};
