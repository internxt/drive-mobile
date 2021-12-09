import React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

const GalleryYear = (): JSX.Element => {
  const onYearPressed = () => {
    console.log('GalleryYear onYearPressed!');
  };

  return (
    <TouchableWithoutFeedback onPress={onYearPressed}>
      <View style={[tailwind('mb-5 w-full rounded-lg bg-blue-50'), { aspectRatio: 2 / 1 }]}>
        <Text style={tailwind('p-5 text-white text-2xl font-semibold')}>September</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default GalleryYear;
