import { StyleSheet } from 'react-native';

export const INCREASED_TOUCH_AREA = { top: 8, left: 8, right: 8, bottom: 8 };
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
