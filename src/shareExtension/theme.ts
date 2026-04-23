import { Platform, useColorScheme } from 'react-native';
import { useShareThemeContext } from './ShareThemeProvider';

/**
 * Used for icon colors, fonts, and values not expressed as tailwind classes (e.g. primaryDisabled).
 */
export const fontStyles = {
  regular: {
    fontFamily: Platform.select({ android: 'InstrumentSans-Regular' }),
  },
  medium: {
    fontWeight: '500' as const,
    fontFamily: Platform.select({ android: 'InstrumentSans-Medium' }),
  },
  semibold: {
    fontWeight: '600' as const,
    fontFamily: Platform.select({ android: 'InstrumentSans-SemiBold' }),
  },
  bold: {
    fontWeight: '700' as const,
    fontFamily: Platform.select({ android: 'InstrumentSans-Bold' }),
  },
} as const;

const lightColors = {
  primary: 'rgba(0,102,255)',
  primaryDisabled: 'rgba(0,102,255,0.5)',
  primaryBg: 'rgba(0,102,255,0.08)',
  primaryBgStrong: 'rgba(0,102,255,0.10)',
  red: 'rgba(255,13,0)',
  redBg: 'rgba(255,230,229)',
  redBorder: 'rgba(255,206,204)',
  successGreen: 'rgba(22,163,74)',
  successBg: 'rgba(22,163,74,0.08)',
  gray100: 'rgba(24,24,27)',
  gray80: 'rgba(58,58,59)',
  gray60: 'rgba(99,99,103)',
  gray40: 'rgba(174,174,179)',
  gray20: 'rgba(209,209,215)',
  gray10: 'rgba(229,229,235)',
  gray5: 'rgba(243,243,248)',
  gray1: 'rgba(249,249,252)',
  surface: 'rgba(255,255,255)',
  white: 'rgb(255,255,255)',
} as const;

const darkColors = {
  primary: 'rgb(20,114,255)',
  primaryDisabled: 'rgba(20,114,255,0.5)',
  primaryBg: 'rgba(20,114,255,0.15)',
  primaryBgStrong: 'rgba(20,114,255,0.20)',
  red: 'rgb(255,61,51)',
  redBg: 'rgb(50,16,16)',
  redBorder: 'rgb(90,28,24)',
  successGreen: 'rgb(72,208,106)',
  successBg: 'rgba(72,208,106,0.15)',
  gray100: 'rgb(249,249,252)',
  gray80: 'rgb(229,229,235)',
  gray60: 'rgb(199,199,205)',
  gray40: 'rgb(142,142,148)',
  gray20: 'rgb(72,72,75)',
  gray10: 'rgb(58,58,59)',
  gray5: 'rgb(44,44,48)',
  gray1: 'rgb(24,24,27)',
  surface: 'rgb(17,17,17)',
  white: 'rgb(255,255,255)',
} as const;

export interface ShareColors {
  primary: string;
  primaryDisabled: string;
  primaryBg: string;
  primaryBgStrong: string;
  red: string;
  redBg: string;
  redBorder: string;
  successGreen: string;
  successBg: string;
  gray100: string;
  gray80: string;
  gray60: string;
  gray40: string;
  gray20: string;
  gray10: string;
  gray5: string;
  gray1: string;
  surface: string;
  white: string;
}

export const useShareColors = (): ShareColors => {
  const themePreference = useShareThemeContext();
  const systemScheme = useColorScheme();
  const theme = themePreference ?? systemScheme;
  return theme === 'dark' ? darkColors : lightColors;
};

export const colors = lightColors;
