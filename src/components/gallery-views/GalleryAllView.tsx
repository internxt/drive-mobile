import React, { useEffect, useState } from 'react';
import { Photo } from '@internxt/sdk/dist/photos';
import { Dimensions, FlatList, ListRenderItemInfo, RefreshControl, View } from 'react-native';
import { NavigationStackProp } from 'react-navigation-stack';
import { useNavigation } from '@react-navigation/native';

import { tailwind } from '../../helpers/designSystem';
import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import { AppScreen } from '../../types';

const GalleryAllView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const { isSelectionModeActivated, photos } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
  const limit = 50;
  const skip = 0;
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
  const onItemPressed = (photo: Photo, preview: string) => {
    isSelectionModeActivated
      ? onItemLongPressed(photo)
      : navigation.push(AppScreen.PhotosPreview, { data: photo, preview });
  };
  const loadPhotos = async () => {
    await dispatch(photosThunks.loadLocalPhotosThunk({ limit, skip }));

    console.log('GalleryAllView.loadPhotos - completed!');
  };

  useEffect(() => {
    loadPhotos();
  }, []);

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
            await loadPhotos();
            setRefreshing(false);
          }}
        />
      }
      decelerationRate={0.5}
      ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
      data={photos}
      onScrollEndDrag={async (event) => {
        const scrollingToBottom = (event.nativeEvent.velocity?.y ?? 0) > 0;

        // Move to store
        // offset = scrollingToBottom ?
        //   offset + limit:
        //   offset - limit;

        await loadPhotos();
      }}
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
              onPress={() => onItemPressed(item.item.data, item.item.preview)}
              onLongPress={() => onItemLongPressed(item.item.data)}
            />
            {!isTheLast && <View style={{ width: gutter }} />}
          </>
        );
      }}
    />
  );
};

export default GalleryAllView;
