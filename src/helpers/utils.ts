import { Linking } from 'react-native';
import { logger } from '../services/common';

export const openUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      logger.error(`Cannot open URL: ${url}, not supported`);
    }
  } catch (error) {
    logger.error(`An error occurred trying to open the URL: ${url}`, error);
  }
};
