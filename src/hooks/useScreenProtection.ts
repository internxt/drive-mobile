import { useEffect, useState } from 'react';
import { CaptureProtection } from 'react-native-capture-protection';
import asyncStorageService from '../services/AsyncStorageService';
import { logger } from '../services/common';

/**
 * Hook to manage screen protection (prevents screenshots and screen recording)
 * Handles initialization, state management, and persistence of user preference
 */
export const useScreenProtection = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initializes screen protection based on saved user preference
   * Defaults to enabled (true) for security if no preference is saved
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const savedPreference = await asyncStorageService.getScreenProtectionEnabled();
        setIsEnabled(savedPreference);

        if (savedPreference) {
          await CaptureProtection.prevent();
        } else {
          await CaptureProtection.allow();
        }

        setIsInitialized(true);
      } catch (error) {
        logger.error('Error initializing screen protection:', error);
        setIsEnabled(true);
        await CaptureProtection.prevent();
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  /**
   * Enables or disables screen protection
   * @param enabled - true to prevent screenshots/recording, false to allow
   */
  const setScreenProtection = async (enabled: boolean): Promise<void> => {
    try {
      setIsEnabled(enabled);

      if (enabled) {
        await CaptureProtection.prevent();
      } else {
        await CaptureProtection.allow();
      }

      await asyncStorageService.saveScreenProtectionEnabled(enabled);
    } catch (error) {
      logger.error('Error setting screen protection:', error);
      setIsEnabled(true);
      await CaptureProtection.prevent();
      await asyncStorageService.saveScreenProtectionEnabled(true);
    }
  };

  return {
    isEnabled,
    isInitialized,
    setScreenProtection,
  };
};
