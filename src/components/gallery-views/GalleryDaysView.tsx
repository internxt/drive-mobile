import moment from 'moment';
import React, { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import useIsMounted from '../../hooks/useIsMounted';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import GalleryDay from '../GalleryDay';

const GalleryDaysView = (): JSX.Element => {
  const isMounted = useIsMounted();
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
          <View style={tailwind('w-full')}>
            <Text
              style={tailwind('px-5 py-2 font-bold text-neutral-700 text-2xl')}
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
            isMounted && setRefreshing(true);
            dispatch(photosActions.resetPhotos());
            await dispatch(photosThunks.loadLocalPhotosThunk());
            isMounted && setRefreshing(false);
          }}
        />
      }
      keyExtractor={(item) => `${item.year}-${item.month}`}
      numColumns={1}
      onEndReached={() => {
        dispatch(photosThunks.loadLocalPhotosThunk());
      }}
      onEndReachedThreshold={2}
    />
  );
};

export default GalleryDaysView;
