import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { logger } from '@internxt-mobile/services/common';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, NativeEventSubscription } from 'react-native';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  isInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Loads the saved theme preference from storage or falls back to system theme
 */
const loadThemePreference = async (): Promise<ThemeMode> => {
  try {
    const savedTheme = await asyncStorageService.getThemePreference();
    logger.info(`Saved theme from storage: ${savedTheme}`);

    if (savedTheme) {
      return savedTheme;
    }

    const systemTheme = Appearance.getColorScheme() as ThemeMode;
    logger.info(`No saved theme, using system theme: ${systemTheme}`);
    return systemTheme || 'light';
  } catch (error) {
    logger.error('Error loading theme preference:', error);
    return 'light';
  }
};

/**
 * Applies the theme to both React state and native appearance
 */
const applyTheme = (theme: ThemeMode, setThemeState: (theme: ThemeMode) => void): void => {
  logger.info(`Applying theme: ${theme}`);
  setThemeState(theme);
  Appearance.setColorScheme(theme);
};

/**
 * Handles system theme changes, only applying if no user preference is saved
 */
const handleSystemThemeChange = async (
  colorScheme: string | null | undefined,
  isInitializingRef: React.MutableRefObject<boolean>,
  isSettingThemeRef: React.MutableRefObject<boolean>,
  setThemeState: (theme: ThemeMode) => void,
): Promise<void> => {
  if (isInitializingRef.current) {
    logger.info('Ignoring theme change event during initialization');
    return;
  }

  if (isSettingThemeRef.current) {
    logger.info('Ignoring theme change event triggered by manual theme change');
    return;
  }

  logger.info(`System theme changed to: ${colorScheme}`);

  const currentSavedTheme = await asyncStorageService.getThemePreference();

  if (!currentSavedTheme && colorScheme) {
    logger.info(`Applying system theme: ${colorScheme} (no saved preference)`);
    applyTheme(colorScheme as ThemeMode, setThemeState);
  } else if (currentSavedTheme) {
    logger.info(`Ignoring system theme change (user preference: ${currentSavedTheme})`);
  }
};

/**
 * Sets up the listener for system theme changes
 */
const setupThemeListener = (
  isInitializingRef: React.MutableRefObject<boolean>,
  isSettingThemeRef: React.MutableRefObject<boolean>,
  setThemeState: (theme: ThemeMode) => void,
): NativeEventSubscription => {
  return Appearance.addChangeListener(async ({ colorScheme }) => {
    await handleSystemThemeChange(colorScheme, isInitializingRef, isSettingThemeRef, setThemeState);
  });
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeState, setThemeState] = useState<ThemeMode>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  const isInitializingRef = useRef(true);
  const isSettingThemeRef = useRef(false);

  useEffect(() => {
    let subscription: NativeEventSubscription | null = null;

    const initializeTheme = async () => {
      try {
        subscription = setupThemeListener(isInitializingRef, isSettingThemeRef, setThemeState);

        const themeToApply = await loadThemePreference();
        applyTheme(themeToApply, setThemeState);

        await new Promise((resolve) => setTimeout(resolve, 100));
        isInitializingRef.current = false;
        setIsInitialized(true);
        logger.info('Theme initialization complete');
      } catch (error) {
        logger.error('Error initializing theme:', error);
        const fallbackTheme = (Appearance.getColorScheme() as ThemeMode) || 'light';
        applyTheme(fallbackTheme, setThemeState);
        isInitializingRef.current = false;
        setIsInitialized(true);
      }
    };

    initializeTheme();

    return () => {
      subscription?.remove();
    };
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      logger.info(`Setting theme to: ${newTheme}`);
      isSettingThemeRef.current = true;

      applyTheme(newTheme, setThemeState);
      await asyncStorageService.saveThemePreference(newTheme);

      setTimeout(() => {
        isSettingThemeRef.current = false;
      }, 100);
    } catch (error) {
      logger.error('Error saving theme preference:', error);
      isSettingThemeRef.current = false;
    }
  };

  const contextValue = useMemo(
    () => ({
      theme: themeState,
      setTheme,
      isInitialized,
    }),
    [themeState, isInitialized],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
