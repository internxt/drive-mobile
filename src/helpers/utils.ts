import { Linking } from 'react-native';
import { logger } from '../services/common';

export const openUrl = async (url: string, onError?: (error: unknown) => void) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    logger.error(`An error occurred trying to open the URL: ${url}`, error);
    onError?.(error);
  }
};
