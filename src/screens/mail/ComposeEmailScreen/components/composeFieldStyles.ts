import { TextStyle } from 'react-native';

import globalStyles from '../../../../styles/global';

export const COMPOSE_LABEL_WIDTH = 72;
export const COMPOSE_ROW_HEIGHT = 52;

/**
 * Every text in a compose row shares this style so the label, the chips and the input line up:
 * same family and size, no line height, and no padding of their own.
 */
export const composeFieldTextStyle: TextStyle = {
  ...globalStyles.fontWeight.regular,
  fontSize: 16,
  padding: 0,
  includeFontPadding: false,
};
