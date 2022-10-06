import React, { useContext, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GalleryItem from '../GalleryItem';
import { PhotosScreenNavigationProp } from '../../types/navigation';
import { PhotosItem } from '../../types/photos';

import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview';
import { PhotosContext } from 'src/contexts/Photos';

const COLUMNS = 3;
const GUTTER = 3;

const GalleryAllView: React.FC<{
  onLoadNextPage: () => Promise<void>;
  onRefresh: () => Promise<void>;
  photos: DataProvider;
}> = ({ onLoadNextPage, onRefresh, photos }) => {
  const photosCtx = useContext(PhotosContext);
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();

  const [refreshing, setRefreshing] = useState(false);

  const itemSize = useMemo(() => (Dimensions.get('window').width - GUTTER * (COLUMNS - 1)) / COLUMNS, []);
  const selectItem = (photosItem: PhotosItem) => {
    photosCtx.selection.selectPhotosItems([photosItem]);
  };

  const deselectItem = (photosItem: PhotosItem) => {
    photosCtx.selection.deselectPhotosItems([photosItem]);
  };
  const onItemLongPressed = (photosItem: PhotosItem) => {
    photosCtx.selection.setSelectionModeActivated(true);
    photosCtx.selection.isPhotosItemSelected(photosItem) ? deselectItem(photosItem) : selectItem(photosItem);
  };
  const onItemPressed = (photosItem: PhotosItem) => {
    if (photosCtx.selection.selectionModeActivated) {
      onItemLongPressed(photosItem);
    } else {
      navigation.navigate('PhotosPreview', {
        photoName: photosItem.name,
      });
    }
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
          <GalleryItem size={itemSize - GUTTER} data={data} onPress={onItemPressed} />
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
        renderAheadOffset={1000}
        renderFooter={renderFooter}
        indicatorStyle={'black'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />
    </View>
  );
};

export default GalleryAllView;
