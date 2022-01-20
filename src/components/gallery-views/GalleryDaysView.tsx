import moment from 'moment';
import React, { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import GalleryDay from '../GalleryDay';

const GalleryDaysView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const photosByMonth = useAppSelector(photosSelectors.photosByMonth);

  /* for (const [yearKey, yearItem] of Object.entries(photosDateRecord).reverse()) {
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
  }*/

  return (
    <FlatList
      data={photosByMonth}
      renderItem={({ item }) => {
        const monthName = moment.months(item.month);
        const monthDays = item.days.map((d) => {
          return (
            <GalleryDay key={d.day.toString()} year={item.year} month={item.month} day={d.day} photos={d.photos} />
          );
        });

        return (
          <View>
            <Text
              style={tailwind('px-5 pt-5 pb-2 font-bold text-neutral-700 text-2xl')}
            >{`${monthName} - ${item.year}`}</Text>
            {monthDays}
          </View>
        );
      }}
      showsVerticalScrollIndicator={true}
      indicatorStyle={'black'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            dispatch(photosActions.resetPhotos());
            await dispatch(photosThunks.loadLocalPhotosThunk());
            setRefreshing(false);
          }}
        />
      }
      decelerationRate={0.5}
      keyExtractor={(item) => `${item.year}-${item.month}`}
      numColumns={1}
      onEndReached={() => {
        console.log('GalleryDaysView - loading more local photos...');
        dispatch(photosThunks.loadLocalPhotosThunk());
      }}
      onEndReachedThreshold={0.5}
    />
  );
};

export default GalleryDaysView;
