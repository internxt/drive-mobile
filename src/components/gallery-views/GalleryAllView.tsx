import React, { useState } from 'react';
import { Photo } from '@internxt/sdk/dist/photos';
import { Dimensions, FlatList, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors } from '../../store/slices/photos';
import { PhotosScreenNavigationProp } from '../../types/navigation';
import { PhotoWithPreview } from '../../types/photos';
import { useTailwind } from 'tailwind-rn';

const COLUMNS = 3;
const GUTTER = 3;
const GalleryAllView: React.FC<{ onLoadNextPage: () => Promise<void> }> = ({ onLoadNextPage }) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const photos = useAppSelector(photosSelectors.getPhotosSorted);

  const { isSelectionModeActivated } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);

  const itemSize = (Dimensions.get('window').width - GUTTER * (COLUMNS - 1)) / COLUMNS;
  const selectItem = (photo: Photo) => {
    dispatch(photosActions.selectPhotos([photo]));
  };

  const deselectItem = (photo: Photo) => {
    dispatch(photosActions.deselectPhotos([photo]));
  };
  const onItemLongPressed = (photo: Photo) => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    isPhotoSelected(photo) ? deselectItem(photo) : selectItem(photo);
  };
  const onItemPressed = (photo: Photo, preview: string | null) => {
    isSelectionModeActivated
      ? onItemLongPressed(photo)
      : preview &&
        navigation.navigate('PhotosPreview', {
          data: {
            ...photo,
            takenAt: photo.takenAt.toISOString(),
            statusChangedAt: photo.statusChangedAt.toISOString(),
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
          },
          preview,
        });
  };

  function renderListItem({ item }: { item: PhotoWithPreview }) {
    return (
      <View style={{ marginRight: GUTTER }}>
        <GalleryItem
          key={item.id}
          size={itemSize}
          data={item}
          isSelected={isPhotoSelected(item)}
          onPress={onItemPressed}
          onLongPress={(photo) => onItemLongPressed(photo)}
        />
      </View>
    );
  }

  function renderItemSeparator() {
    return <View style={{ height: GUTTER }} />;
  }

  function extractKey(item: Photo) {
    return item.id;
  }

  async function onScrollEnd() {
    await onLoadNextPage();
  }
  return (
    <FlatList<PhotoWithPreview>
      contentContainerStyle={{ paddingBottom: itemSize }}
      style={tailwind('bg-white')}
      showsVerticalScrollIndicator
      indicatorStyle={'black'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);

            setRefreshing(false);
          }}
        />
      }
      ItemSeparatorComponent={renderItemSeparator}
      data={photos}
      numColumns={COLUMNS}
      onEndReached={onScrollEnd}
      onEndReachedThreshold={3}
      keyExtractor={extractKey}
      renderItem={renderListItem}
    />
  );
};

export default GalleryAllView;
