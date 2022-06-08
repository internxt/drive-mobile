import React from 'react';
import { StyleProp, Text, TouchableHighlight, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import globalStyle from '../../styles/global';
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
  const isTitleString = typeof props.title === 'string';
  const typeBgStyle = {
    accept: props.disabled ? tailwind('bg-neutral-30') : tailwind('bg-blue-60'),
    cancel: tailwind('bg-neutral-20'),
    'cancel-2': tailwind('bg-blue-10'),
    delete: tailwind('bg-red-60'),
  }[props.type];
  const typeTextStyle = {
    accept: props.disabled ? tailwind('text-neutral-60') : tailwind('text-white'),
    cancel: tailwind('text-neutral-300'),
    'cancel-2': tailwind('text-blue-60'),
    delete: tailwind('text-white'),
  }[props.type];
  const typeUnderlayColor = {
    accept: tailwind('text-blue-70').color as string,
    cancel: tailwind('text-neutral-30').color as string,
    'cancel-2': tailwind('text-neutral-30').color as string,
    delete: tailwind('text-red-70').color as string,
  }[props.type];

  const renderContent = () => {
    if (props.loading) {
      return (
        <View style={tailwind('h-7 flex items-center justify-center')}>
          <LoadingSpinner color={tailwind('white').color as string} size={16} />
        </View>
      );
    }

    if (isTitleString) {
      return (
        <Text numberOfLines={1} style={[tailwind('text-lg'), globalStyle.fontWeight.medium, typeTextStyle]}>
          {props.title}
        </Text>
      );
    }

    return props.title;
  };
  return (
    <TouchableHighlight
      testID={props.testID}
      underlayColor={typeUnderlayColor}
      style={[tailwind('rounded-lg px-4 py-2 items-center justify-center '), typeBgStyle, props.style]}
      onPress={props.onPress}
      disabled={!!props.disabled || !!props.loading}
    >
      {renderContent()}
    </TouchableHighlight>
  );
};

export default AppButton;
