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
  primary: 'rgb(0, 102, 255)',
  primaryDisabled: 'rgba(0, 102, 255, 0.5)',
  red: 'rgb(255, 13, 0)',
  gray100: 'rgb(24, 24, 27)',
  gray80: 'rgb(58, 58, 59)',
  gray60: 'rgb(99, 99, 103)',
  gray40: 'rgb(174, 174, 179)',
  gray20: 'rgb(209, 209, 215)',
  gray10: 'rgb(229, 229, 235)',
  gray5: 'rgb(243, 243, 248)',
  gray1: 'rgb(249, 249, 252)',
  surface: '#ffffff',
} as const;
