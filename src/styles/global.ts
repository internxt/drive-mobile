import { StyleSheet } from 'react-native';

export const INCREASED_TOUCH_AREA = { top: 16, left: 16, right: 16, bottom: 16 };
export const INCREASED_TOUCH_AREA_X2 = {
  top: INCREASED_TOUCH_AREA.top * 2,
  left: INCREASED_TOUCH_AREA.left * 2,
  right: INCREASED_TOUCH_AREA.right * 2,
  bottom: INCREASED_TOUCH_AREA.bottom * 2,
};
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
