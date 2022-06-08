import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import GalleryYear from '../GalleryYear';

const GalleryYearsView = (): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const { years } = useAppSelector((state) => state.photos);
  const yearsList = years.map((data) => <GalleryYear key={data.year.toString()} {...data} />);

  useEffect(() => {
    dispatch(photosThunks.loadYearsThunk());
  }, []);

  return <ScrollView style={tailwind('px-5')}>{yearsList}</ScrollView>;
};

export default GalleryYearsView;
