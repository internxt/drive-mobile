import React from 'react';

import { View } from 'react-native';

// UI Icons
import CheckMark from './userInterface/checkmark';
import Details from './userInterface/details';

import { colors } from '../../src/redux/constants';

const defaultColors = {
  'blue': colors['blue'].icon,
  'green': colors['green'].icon,
  'grey': colors['grey'].icon,
  'pink': colors['pink'].icon,
  'purple': colors['purple'].icon,
  'red': colors['red'].icon,
  'yellow': colors['yellow'].icon
}

// Icon class to use every svg icons without importing it
// and bringing possibility to pass attributes like color, size, etc
// - color (2 options)
//      1. default colors described in defaultColors array (blue, green...)
//      2. Hexadecimal colors (not every icon works with that) eg. #CCC #3482AD
// Usage:  import Icon from '../../assets/Icon'
//  <Icon name="folder" color="blue" height="75"/>

interface IconProps {
  style?: any
  name: string
  width?: number
  height?: number
  color?: any
}

function Icon(props: IconProps) {
  switch (props.name) {
    // UI icons
    case "checkmark":
      return <CheckMark defaultColors={defaultColors} {...props} />;
    case "details":
      return <Details defaultColors={defaultColors} {...props} />;
    default:
      console.error('Missing icon:', props.name);
      return <View></View>;
  }
}

export default Icon;
