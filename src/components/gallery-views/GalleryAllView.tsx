import React, { useState } from 'react';
import { Photo } from '@internxt/sdk/dist/photos';
import { Dimensions, FlatList, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { tailwind } from '../../helpers/designSystem';
import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors } from '../../store/slices/photos';
import { PhotosScreenNavigationProp } from '../../types/navigation';

const GalleryAllView: React.FC<{ onLoadNextPage: () => Promise<void> }> = ({ onLoadNextPage }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const photos = useAppSelector(photosSelectors.getPhotosSorted);

  const { isSelectionModeActivated } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
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

  function renderListItem({ item }: { item: Photo & { resolvedPreview?: string } }) {
    return (
      <View style={{ marginRight: gutter }}>
        <GalleryItem
          size={itemSize}
          data={item}
          resolvedPreview={item.resolvedPreview}
          isSelected={isPhotoSelected(item)}
          onPress={onItemPressed}
          onLongPress={(photo) => onItemLongPressed(photo)}
        />
      </View>
    );
  }

  function renderItemSeparator() {
    return <View style={{ height: gutter }} />;
  }

  function extractKey(item: Photo) {
    return item.id;
  }

  async function onScrollEnd() {
    await onLoadNextPage();
  }
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

            setRefreshing(false);
          }}
        />
      }
      decelerationRate={0.5}
      ItemSeparatorComponent={renderItemSeparator}
      data={photos}
      onScrollEndDrag={onScrollEnd}
      numColumns={columnsCount}
      onEndReached={() => undefined}
      onEndReachedThreshold={3}
      keyExtractor={extractKey}
      renderItem={renderListItem}
    />
  );
};

export default GalleryAllView;
