import { createContext, useContext, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | null | undefined;

export const ShareThemeContext = createContext<ThemePreference>(undefined);

interface ShareThemeProviderProps {
  themePreference: ThemePreference;
  children: ReactNode;
}

export const ShareThemeProvider = ({ themePreference, children }: ShareThemeProviderProps) => (
  <ShareThemeContext.Provider value={themePreference}>{children}</ShareThemeContext.Provider>
);

export const useShareThemeContext = (): ThemePreference => useContext(ShareThemeContext);
