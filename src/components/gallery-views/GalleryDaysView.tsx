import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import GalleryDay from '../GalleryDay';

const GalleryDaysView = (): JSX.Element => {
  const monthsList = [
    <View>
      <Text style={tailwind('px-5 pt-5 pb-2 font-bold text-neutral-700 text-2xl')}>September</Text>
      <GalleryDay />
    </View>,
  ];

  return <ScrollView>{monthsList}</ScrollView>;
};

export default GalleryDaysView;
