import React from 'react';
import { View } from 'react-native';
import AppText from '../AppText';

interface EmptyListProps {
  title: string;
  message: string;
  image: JSX.Element;
}

const EmptyList = (props: EmptyListProps): JSX.Element => {
  return (
    <View pointerEvents="none" className="flex items-center opacity-50 h-full justify-center">
      {props.image}
      <AppText semibold className="text-center m-5 mb-1">
        {props.title}
      </AppText>
      <AppText className="text-center my-1 mx-3">{props.message}</AppText>
    </View>
  );
};

export default EmptyList;
