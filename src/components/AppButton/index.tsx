import React from 'react';
import { StyleProp, TouchableHighlight, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import LoadingSpinner from '../LoadingSpinner';

interface AppButtonProps {
  testID?: string;
  title: string | JSX.Element;
  type: 'accept' | 'cancel' | 'cancel-2' | 'delete';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppButton = (props: AppButtonProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const isTitleString = typeof props.title === 'string';
  const typeBgStyle = {
    accept: props.disabled ? tailwind('bg-gray-40') : tailwind('bg-blue-60'),
    cancel: tailwind('bg-neutral-20'),
    'cancel-2': tailwind('bg-blue-10'),
    delete: tailwind('bg-red-'),
  }[props.type];
  const typeTextStyle = {
    accept: tailwind('text-white'),
    cancel: tailwind('text-neutral-300'),
    'cancel-2': tailwind('text-blue-60'),
    delete: tailwind('text-white'),
  }[props.type];
  const typeUnderlayColor = {
    accept: getColor('text-blue-70'),
    cancel: getColor('text-neutral-30'),
    'cancel-2': getColor('text-neutral-30'),
    delete: getColor('text-red-dark'),
  }[props.type];

  const renderContent = () => {
    if (props.loading) {
      return (
        <View style={tailwind('h-7 flex items-center justify-center')}>
          <LoadingSpinner color={getColor('text-white')} size={16} />
        </View>
      );
    }

    if (isTitleString) {
      return (
        <AppText medium numberOfLines={1} style={[tailwind('text-lg'), typeTextStyle]}>
          {props.title}
        </AppText>
      );
    }

    return props.title;
  };
  return (
    <TouchableHighlight
      testID={props.testID}
      underlayColor={typeUnderlayColor}
      style={[tailwind('rounded-lg px-4 py-3 items-center justify-center'), typeBgStyle, props.style]}
      onPress={props.onPress}
      disabled={!!props.disabled || !!props.loading}
    >
      {renderContent()}
    </TouchableHighlight>
  );
};

export default AppButton;
