import React from 'react';
import { View, TouchableHighlight } from 'react-native';
import { useTailwind } from 'tailwind-rn';

interface BottomModalOptionProps {
  disabled?: boolean;
  leftSlot: string | JSX.Element;
  rightSlot: JSX.Element;
  onPress?: () => void;
}

const BottomModalOption = (props: BottomModalOptionProps): JSX.Element => {
  const tailwind = useTailwind();

  return (
    <TouchableHighlight
      disabled={props.disabled}
      onPress={props.onPress}
      underlayColor={props.onPress && (tailwind('text-neutral-20').color as string)}
    >
      <View
        style={[
          props.disabled && tailwind('bg-neutral-30'),
          tailwind('flex-row items-center px-4 h-12 border-neutral-20 border-t border-b'),
        ]}
      >
        {props.leftSlot}
        <View style={tailwind('ml-5')}>{props.rightSlot}</View>
      </View>
    </TouchableHighlight>
  );
};

export default BottomModalOption;
