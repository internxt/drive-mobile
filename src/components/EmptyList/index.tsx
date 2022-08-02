import React from 'react';
import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AppText from '../AppText';

interface EmptyListProps {
  title: string;
  message: string;
  image: JSX.Element;
}

const EmptyList = (props: EmptyListProps): JSX.Element => {
  const tailwind = useTailwind();

  return (
    <View pointerEvents="none" style={tailwind('flex items-center opacity-50 h-full justify-center')}>
      {props.image}
      <AppText semibold style={tailwind('text-center m-5 mb-1')}>
        {props.title}
      </AppText>
      <AppText style={tailwind('text-center my-1 mx-3')}>{props.message}</AppText>
    </View>
  );
};

export default EmptyList;
