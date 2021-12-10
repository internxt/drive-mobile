import React from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';

import { tailwind } from '../../helpers/designSystem';

const BottomModalOption = (props: {
  name: string | JSX.Element;
  onPress: () => void;
  icon: JSX.Element;
  lastItem?: boolean;
}): JSX.Element => {
  return (
    <TouchableWithoutFeedback onPress={props.onPress}>
      <View
        style={[tailwind('flex-row items-center px-4 h-12 border-neutral-20'), !props.lastItem && tailwind('border-b')]}
      >
        <View style={tailwind('flex-grow')}>
          <Text>{props.name}</Text>
        </View>
        <View>{props.icon}</View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BottomModalOption;
