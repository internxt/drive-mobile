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
      keyExtractor={(item) => `${item.year}-${item.month}`}
      numColumns={3}
      onEndReached={() => {
        dispatch(photosThunks.loadLocalPhotosThunk());
      }}
      onEndReachedThreshold={2}
    />
  );
};

export default GalleryDaysView;
