import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import { useAppDispatch } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import GalleryMonth from '../GalleryMonth';

const GalleryMonthsView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const yearsList = [
    <View key="0" style={tailwind('px-5 pt-5')}>
      <Text style={tailwind('pb-4 font-bold text-neutral-700 text-4xl')}>2000</Text>
      <GalleryMonth key="1" />
      <GalleryMonth key="2" />
      <GalleryMonth key="3" />
      <GalleryMonth key="4" />
    </View>,
  ];

  useEffect(() => {
    dispatch(photosThunks.loadMonthsThunk());
  }, []);

  return <ScrollView>{yearsList}</ScrollView>;
};

export default GalleryMonthsView;
