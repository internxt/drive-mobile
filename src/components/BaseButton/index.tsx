import React from 'react';
import { Text, TouchableHighlight } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';

interface BaseButtonProps {
  title: string;
  type: 'accept' | 'cancel' | 'delete';
  onPress: () => void;
  disabled?: boolean;
}

const BaseButton = (props: BaseButtonProps): JSX.Element => {
  const typeBgStyle = {
    accept: tailwind('bg-blue-60'),
    cancel: tailwind('bg-neutral-20'),
    delete: tailwind('bg-red-60'),
  }[props.type];
  const typeTextStyle = {
    accept: tailwind('text-white'),
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
      style={[tailwind('rounded-lg p-2 flex-1 flex-grow items-center justify-center'), typeBgStyle]}
      onPress={props.onPress}
      disabled={!!props.disabled}
    >
      <Text style={[tailwind('text-lg'), globalStyle.fontWeight.medium, typeTextStyle]}>{props.title}</Text>
    </TouchableHighlight>
  );
};

export default BaseButton;
