import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import GalleryMonth from '../GalleryMonth';

const GalleryMonthsView = (): JSX.Element => {
  return <View></View>;
  /* const dispatch = useAppDispatch();
  const { months } = useAppSelector((state) => state.photos);
  const byYearMonths = months.reduce<Record<number, { month: number; preview: string }[]>>((t, x) => {
    const monthItem = {
      month: x.month,
      preview: x.preview,
    };

    if (t[x.year]) {
      t[x.year].push(monthItem);
    } else {
      t[x.year] = [monthItem];
    }

    return t;
  }, {});
  const yearsList = Object.entries(byYearMonths).map(([key, value]) => {
    const monthsList = value.map(({ month, preview }) => (
      <GalleryMonth key={month.toString()} month={month} preview={preview} />
    ));

    return (
      <View key={key} style={tailwind('px-5 pt-5')}>
        <Text style={tailwind('pb-4 font-bold text-neutral-700 text-4xl')}>{key}</Text>
        {monthsList}
      </View>
    );
  });

  useEffect(() => {
    dispatch(photosThunks.loadMonthsThunk());
  }, []);

  return <ScrollView>{yearsList}</ScrollView>; */
};

export default GalleryMonthsView;
