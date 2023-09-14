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
    regular: {
      fontFamily: 'InstrumentSans-Regular',
    },
    medium: {
      fontFamily: 'InstrumentSans-Medium',
    },
    semibold: {
      fontFamily: 'InstrumentSans-SemiBold',
    },
    bold: {
      fontFamily: 'InstrumentSans-Bold',
    },
  }),
};

export const getLineHeight = (fontSize: number, lineHeightPercentage: number) => fontSize * lineHeightPercentage;
