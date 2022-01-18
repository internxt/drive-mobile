import React from 'react';
import { View, TouchableHighlight } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';

const BottomModalOption = (props: {
  leftSlot: string | JSX.Element;
  rightSlot: JSX.Element;
  onPress?: () => void;
}): JSX.Element => {
  return (
    <TouchableHighlight onPress={props.onPress} underlayColor={props.onPress && getColor('neutral-20')}>
      <View style={[tailwind('flex-row items-center px-4 h-12 border-neutral-20 border-t border-b')]}>
        {props.leftSlot}
        <View style={tailwind('ml-5')}>{props.rightSlot}</View>
      </View>
    </TouchableHighlight>
  );
};

export default BottomModalOption;
