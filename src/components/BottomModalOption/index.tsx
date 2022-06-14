import React from 'react';
import { View, TouchableHighlight } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

interface BottomModalOptionProps {
  disabled?: boolean;
  leftSlot: string | JSX.Element;
  rightSlot: JSX.Element;
  onPress?: () => void;
}

const BottomModalOption = (props: BottomModalOptionProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <TouchableHighlight
      disabled={props.disabled}
      onPress={props.onPress}
      underlayColor={props.onPress && getColor('text-neutral-20')}
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
