import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import GalleryMonth from '../GalleryMonth';

const GalleryMonthsView = (): JSX.Element => {
  const yearsList = [
    <View style={tailwind('px-5 pt-5')}>
      <Text style={tailwind('pb-4 font-bold text-neutral-700 text-4xl')}>2000</Text>
      <GalleryMonth />
      <GalleryMonth />
      <GalleryMonth />
      <GalleryMonth />
    </View>,
  ];

  return <ScrollView>{yearsList}</ScrollView>;
};

export default GalleryMonthsView;
