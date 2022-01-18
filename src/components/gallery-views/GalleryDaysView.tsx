import moment from 'moment';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import { useAppSelector } from '../../store/hooks';
import { photosSelectors } from '../../store/slices/photos';
import GalleryDay from '../GalleryDay';

const GalleryDaysView = (): JSX.Element => {
  const photosDateRecord = useAppSelector(photosSelectors.photosDateRecord);
  const monthsList: JSX.Element[] = [];

  for (const [yearKey, yearItem] of Object.entries(photosDateRecord).reverse()) {
    const yearMonths: JSX.Element[] = [];

    for (const [monthKey, monthItem] of Object.entries(yearItem).reverse()) {
      const monthName = moment.months(parseInt(monthKey));
      const monthDays = Object.entries(monthItem)
        .reverse()
        .map(([dayKey, dayPhotos]) => {
          return (
            <GalleryDay
              key={dayKey}
              year={parseInt(yearKey)}
              month={parseInt(monthKey)}
              day={parseInt(dayKey)}
              photos={dayPhotos}
            />
          );
        });

      yearMonths.push(
        <View>
          <Text
            style={tailwind('px-5 pt-5 pb-2 font-bold text-neutral-700 text-2xl')}
          >{`${monthName} - ${yearKey}`}</Text>
          {monthDays}
        </View>,
      );
    }

    monthsList.push(...yearMonths);
  }

  return <ScrollView>{monthsList}</ScrollView>;
};

export default GalleryDaysView;
