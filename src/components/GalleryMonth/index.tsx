import React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

const GalleryMonth = (): JSX.Element => {
  const onMonthPressed = () => {
    console.log('GalleryMonth onMonthPressed!');
  };

  return (
    <TouchableWithoutFeedback onPress={onMonthPressed}>
      <View style={[tailwind('mb-5 w-full rounded-lg bg-blue-50'), { aspectRatio: 2 / 1 }]}>
        <Text style={tailwind('p-5 text-white text-2xl font-semibold')}>September</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default GalleryMonth;
