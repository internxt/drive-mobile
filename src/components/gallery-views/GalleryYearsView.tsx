import React from 'react';
import { ScrollView } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import GalleryYear from '../GalleryYear';

const GalleryYearsView = (): JSX.Element => {
  const yearsList = [
    <GalleryYear key={'1'} />,
    <GalleryYear key={'2'} />,
    <GalleryYear key={'3'} />,
    <GalleryYear key={'4'} />,
  ];

  return <ScrollView style={tailwind('px-5')}>{yearsList}</ScrollView>;
};

export default GalleryYearsView;
