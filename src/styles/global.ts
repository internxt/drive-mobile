import { StyleSheet } from 'react-native';

export const INCREASED_TOUCH_AREA = { top: 16, left: 16, right: 16, bottom: 16 };
export default {
  fontWeight: StyleSheet.create({
    light: {
      fontFamily: 'NeueEinstellung-Light',
    },
    regular: {
      fontFamily: 'NeueEinstellung-Regular',
    },
    medium: {
      fontFamily: 'NeueEinstellung-Medium',
    },
    semibold: {
      fontFamily: 'NeueEinstellung-SemiBold',
    },
    bold: {
      fontFamily: 'NeueEinstellung-Bold',
    },
  }),
};

export const getLineHeight = (fontSize: number, lineHeightPercentage: number) => fontSize * lineHeightPercentage;
