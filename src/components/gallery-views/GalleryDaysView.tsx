import moment from 'moment';
import React, { useState } from 'react';
import { FlatList, RefreshControl, SectionList, Text, View } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import useIsMounted from '../../hooks/useIsMounted';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosThunks } from '../../store/slices/photos';
import { PhotosCollection } from '../../types/photos';
import GalleryDay from '../GalleryDay';

const GalleryDaysView = (): JSX.Element => {
  const isMounted = useIsMounted();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const photosByMonth = useAppSelector((state) => state.photos.photosByMonth);

  return (
    <SectionList<PhotosCollection, { title: string }>
      data={photosByMonth}
      renderSectionHeader={({ section }) => {
        const monthName = moment.months(new Date(item.date).getMonth());
        return (
          <Text style={tailwind('px-5 py-2 font-bold text-neutral-700 text-2xl')}>{`${monthName} - ${item.year}`}</Text>
        );
      }}
      renderItem={({ item }) => {
        const monthDays = item.photos.map((d) => {
          return (
            <GalleryDay key={d.day.toString()} year={item.year} month={item.month} day={d.day} photos={d.photos} />
          );
        });

        return <View style={tailwind('w-full')}>{monthDays}</View>;
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
      onEndReachedThreshold={3}
    />
  );
};

export default GalleryDaysView;
