import React from 'react';
import { View, TouchableHighlight } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

interface BottomModalOptionProps {
  disabled?: boolean;
  leftSlot: string | JSX.Element;
  rightSlot: JSX.Element;
  onPress?: () => void;
  hideBorderBottom?: boolean;
}

const BottomModalOption = (props: BottomModalOptionProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <>
      <TouchableHighlight
        disabled={props.disabled}
        onPress={props.onPress}
        style={tailwind(`${props.disabled ? 'opacity-50' : ''} h-14 px-4`)}
        underlayColor={props.onPress && getColor('text-gray-5')}
      >
        <View style={tailwind('flex flex-row justify-center h-full flex-col w-full')}>
          <View style={[tailwind('flex-row items-center h-full ml-3')]}>
            {props.leftSlot}
            <View style={tailwind('ml-6 flex-1 justify-start items-start')}>{props.rightSlot}</View>
          </View>
          {!props.hideBorderBottom && <View style={[tailwind('border-b border-gray-5 w-full'), { height: 1 }]} />}
        </View>
      </TouchableHighlight>
    </>
  );
};

export default BottomModalOption;
