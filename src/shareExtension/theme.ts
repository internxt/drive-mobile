import { Platform } from 'react-native';

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

export const colors = {
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
} as const;
