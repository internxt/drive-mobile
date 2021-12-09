import React from 'react';
import { ScrollView } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import GalleryYear from '../GalleryYear';

const GalleryYearsView = (): JSX.Element => {
  const yearsList = [<GalleryYear />, <GalleryYear />, <GalleryYear />, <GalleryYear />];

  return <ScrollView style={tailwind('px-5')}>{yearsList}</ScrollView>;
};

export default GalleryYearsView;
