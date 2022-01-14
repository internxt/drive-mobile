import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { Photo } from '@internxt/sdk/dist/photos';

import { getColor, tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import GalleryItem from '../GalleryItem';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import { PhotosScreen } from '../../types/photos';

const GalleryDay = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const isAllPhotosSelected = false;
  const { isSelectionModeActivated, photos } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
  const selectAll = () => {
    console.log('GalleryDay selectAll pressed!');
  };
  const deselectAll = () => {
    console.log('GalleryDay deselectAll pressed!');
  };
  const selectItem = (photo: Photo) => {
    dispatch(photosActions.selectPhoto(photo));
  };
  const deselectItem = (photo: Photo) => {
    dispatch(photosActions.deselectPhoto(photo));
  };
  const onItemLongPressed = (photo: Photo) => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    isPhotoSelected(photo) ? deselectItem(photo) : selectItem(photo);
  };
  const onItemPressed = (item: Photo) => {
    isSelectionModeActivated ? onItemLongPressed(item) : navigation.push(PhotosScreen.Preview, { data: item });
  };

  return (
    <View style={tailwind('mb-6')}>
      {/* TITLE */}
      <View style={tailwind('flex-row justify-between px-5 mb-6')}>
        <Text style={tailwind('text-base text-neutral-500')}>Sunday, 26 September</Text>
        {isAllPhotosSelected ? (
          <TouchableWithoutFeedback
            style={[tailwind('bg-blue-60 w-5 h-5 flex justify-center items-center rounded-xl')]}
            onPress={deselectAll}
          >
            <Unicons.UilCheckCircle color={getColor('white')} size={30} />
          </TouchableWithoutFeedback>
        ) : (
          <TouchableWithoutFeedback
            onPress={selectAll}
            style={[tailwind('bg-white w-5 h-5 flex justify-center items-center rounded-xl')]}
          >
            <Unicons.UilCheckCircle color={getColor('neutral-60')} size={30} />
          </TouchableWithoutFeedback>
        )}
      </View>

      {/* PHOTOS LIST */}
      <FlatList
        style={tailwind('bg-white')}
        showsVerticalScrollIndicator={true}
        indicatorStyle={'black'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await dispatch(photosThunks.loadLocalPhotosThunk({ limit: 15, skip: 0 }));
              setRefreshing(false);
            }}
          />
        }
        decelerationRate={0.5}
        ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
        data={photos}
        numColumns={columnsCount}
        onEndReached={() => undefined}
        onEndReachedThreshold={3}
        keyExtractor={(item) => item.data.id}
        renderItem={(item: ListRenderItemInfo<{ data: Photo; preview: string }>) => {
          const isTheLast = item.index === photos.length - 1;

          return (
            <>
              <GalleryItem
                size={itemSize}
                data={item.item.data}
                preview={item.item.preview}
                isSelected={isPhotoSelected(item.item.data)}
                onPress={() => onItemPressed(item.item.data)}
                onLongPress={() => onItemLongPressed(item.item.data)}
              />
              {!isTheLast && <View style={{ width: gutter }} />}
            </>
          );
        }}
      />
    </View>
  );
};

export default GalleryDay;
