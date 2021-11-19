import React from 'react';
import { Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

interface EmptyListProps {
  title: string;
  message: string;
  image: JSX.Element;
}

const EmptyList = (props: EmptyListProps) => {
  return (
    <View style={tailwind('flex items-center opacity-50 h-full justify-center')}>
      <>
        {props.image}
        <Text style={tailwind('text-base text-base-color font-bold m-5 mb-1')}>{props.title}</Text>
        <Text style={tailwind('text-base text-base-color m-1')}>{props.title}</Text>
      </>
    </View>
  );
};

export default EmptyList;
