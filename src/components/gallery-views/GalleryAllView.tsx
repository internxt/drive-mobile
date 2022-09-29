import React, { useMemo, useState } from 'react';
import { Dimensions, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors } from '../../store/slices/photos';
import { PhotosScreenNavigationProp } from '../../types/navigation';
import { PhotosItem } from '../../types/photos';

import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview';

const COLUMNS = 3;
const GUTTER = 3;

const GalleryAllView: React.FC<{
  onLoadNextPage: () => Promise<void>;
  onRefresh: () => Promise<void>;
  photos: DataProvider;
}> = ({ onLoadNextPage, onRefresh, photos }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);

  const { isSelectionModeActivated } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);

  const itemSize = useMemo(() => (Dimensions.get('window').width - GUTTER * (COLUMNS - 1)) / COLUMNS, []);
  const selectItem = (photosItem: PhotosItem) => {
    dispatch(photosActions.selectPhotos([photosItem]));
  };

  const deselectItem = (photosItem: PhotosItem) => {
    dispatch(photosActions.deselectPhotos([photosItem]));
  };
  const onItemLongPressed = (photosItem: PhotosItem) => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    isPhotoSelected(photosItem) ? deselectItem(photosItem) : selectItem(photosItem);
  };
  const onItemPressed = (photosItem: PhotosItem) => {
    isSelectionModeActivated
      ? onItemLongPressed(photosItem)
      : navigation.navigate('PhotosPreview', {
          photoName: photosItem.name,
        });
  };

  async function onScrollEnd() {
    await onLoadNextPage();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  const layoutProvider = new LayoutProvider(
    () => 0,
    (_, dimensions) => {
      dimensions.width = itemSize;
      dimensions.height = itemSize;
    },
  );

  layoutProvider.shouldRefreshWithAnchoring = false;

  function renderRow(_: unknown, data: PhotosItem) {
    return (
      <>
        <View style={{}}>
          <GalleryItem
            size={itemSize - GUTTER}
            data={data}
            isSelected={isPhotoSelected(data)}
            onPress={onItemPressed}
            onLongPress={onItemLongPressed}
          />
        </View>
        <View style={{ height: GUTTER }} />
      </>
    );
  }

  function renderFooter() {
    return <></>;
  }
  return (
    <View style={{ flex: 1 }}>
      <RecyclerListView
        onEndReached={onScrollEnd}
        layoutProvider={layoutProvider}
        rowRenderer={renderRow}
        dataProvider={photos}
        onEndReachedThreshold={itemSize * 10}
        renderFooter={renderFooter}
        indicatorStyle={'black'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />
    </View>
  );
};

export default GalleryAllView;
