import React from 'react';
import { StyleProp, TouchableHighlight, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import LoadingSpinner from '../LoadingSpinner';

interface AppButtonProps {
  testID?: string;
  title: string | JSX.Element;
  type: 'accept' | 'accept-2' | 'cancel' | 'cancel-2' | 'delete' | 'white';
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
    accept: props.disabled
      ? props.loading
        ? tailwind('bg-primary-dark')
        : tailwind('bg-gray-40')
      : tailwind('bg-primary'),
    'accept-2': props.disabled ? tailwind('bg-gray-40') : tailwind('bg-primary/10'),
    cancel: tailwind('bg-gray-5'),
    'cancel-2': tailwind('bg-primary/10'),
    delete: props.disabled ? tailwind('bg-gray-40') : tailwind('bg-red'),
    white: {
      ...tailwind('bg-white'),
      ...({
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.16,
        shadowRadius: 1.51,
        elevation: 2,
      } as ViewStyle),
    },
  }[props.type];
  const typeTextStyle = {
    accept: tailwind('text-white'),
    'accept-2': props.disabled ? tailwind('text-white') : tailwind('text-primary'),
    cancel: props.disabled ? tailwind('text-gray-40') : tailwind('text-gray-80'),
    'cancel-2': tailwind('text-primary'),
    delete: tailwind('text-white'),
    white: tailwind('text-gray-80'),
  }[props.type];
  const typeUnderlayColor = {
    accept: getColor('text-primary-dark'),
    'accept-2': getColor('text-primary/20'),
    cancel: getColor('text-gray-10'),
    'cancel-2': getColor('text-gray-10'),
    delete: getColor('text-red-dark'),
    white: getColor('text-gray-1'),
  }[props.type];

  const renderContent = () => {
    const title = isTitleString ? (
      <AppText medium numberOfLines={1} style={[tailwind('text-base'), typeTextStyle]}>
        {props.title}
      </AppText>
    ) : (
      props.title
    );

    return (
      <View style={tailwind('flex-row')}>
        {props.loading && (
          <View style={tailwind('mr-2 items-center justify-center')}>
            <LoadingSpinner color={getColor('text-white')} size={16} />
          </View>
        )}
        {title}
      </View>
    );
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
