import React, { useState } from 'react';
import { Photo } from '@internxt/sdk';
import { Dimensions, FlatList, ListRenderItemInfo, RefreshControl, View } from 'react-native';
import { NavigationStackProp } from 'react-navigation-stack';
import { useNavigation } from '@react-navigation/native';

import { tailwind } from '../../helpers/designSystem';
import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PhotosScreen } from '../../types';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';

const GalleryAllView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const { isSelectionModeActivated, photos } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
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
    <FlatList
      style={tailwind('bg-white')}
      showsVerticalScrollIndicator={true}
      indicatorStyle={'black'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await dispatch(photosThunks.loadLocalPhotosThunk({}));
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
      keyExtractor={(item) => item.id}
      renderItem={(item: ListRenderItemInfo<Photo>) => {
        const isTheLast = item.index === photos.length - 1;

        return (
          <>
            <GalleryItem
              size={itemSize}
              data={item.item}
              isSelected={isPhotoSelected(item.item)}
              onPress={() => onItemPressed(item.item)}
              onLongPress={() => onItemLongPressed(item.item)}
            />
            {!isTheLast && <View style={{ width: gutter }} />}
          </>
        );
      }}
    />
  );
};

export default GalleryAllView;
