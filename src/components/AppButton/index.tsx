import React from 'react';
import { StyleProp, Text, TouchableHighlight, ViewStyle } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';

interface AppButtonProps {
  title: string | JSX.Element;
  type: 'accept' | 'cancel' | 'delete';
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppButton = (props: AppButtonProps): JSX.Element => {
  const isTitleString = typeof props.title === 'string';
  const typeBgStyle = {
    accept: props.disabled ? tailwind('bg-neutral-30') : tailwind('bg-blue-60'),
    cancel: tailwind('bg-neutral-20'),
    delete: tailwind('bg-red-60'),
  }[props.type];
  const typeTextStyle = {
    accept: props.disabled ? tailwind('text-neutral-60') : tailwind('text-white'),
    cancel: tailwind('text-neutral-300'),
    delete: tailwind('text-white'),
  }[props.type];
  const typeUnderlayColor = {
    accept: getColor('blue-70'),
    cancel: getColor('neutral-30'),
    delete: getColor('red-70'),
  }[props.type];

  return (
    <TouchableHighlight
      underlayColor={typeUnderlayColor}
      style={[tailwind('rounded-lg py-2 px-4 items-center justify-center'), typeBgStyle, props.style]}
      onPress={props.onPress}
      disabled={!!props.disabled}
    >
      {isTitleString ? (
        <Text numberOfLines={1} style={[tailwind('text-lg'), globalStyle.fontWeight.medium, typeTextStyle]}>
          {props.title}
        </Text>
      ) : (
        props.title
      )}
    </TouchableHighlight>
  );
};

export default AppButton;
