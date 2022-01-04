import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import GalleryMonth from '../GalleryMonth';

const GalleryMonthsView = (): JSX.Element => {
  const yearsList = [
    <View key="0" style={tailwind('px-5 pt-5')}>
      <Text style={tailwind('pb-4 font-bold text-neutral-700 text-4xl')}>2000</Text>
      <GalleryMonth key="1" />
      <GalleryMonth key="2" />
      <GalleryMonth key="3" />
      <GalleryMonth key="4" />
    </View>,
  ];

  return <ScrollView>{yearsList}</ScrollView>;
};

export default GalleryMonthsView;
