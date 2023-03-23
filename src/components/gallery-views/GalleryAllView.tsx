import React, { useContext, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GalleryItem from '../GalleryItem';
import { PhotosScreenNavigationProp } from '../../types/navigation';
import { PhotosItem } from '../../types/photos';

import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview';
import { PhotosContext } from 'src/contexts/Photos';
import _ from 'lodash';
import { useTailwind } from 'tailwind-rn';

const COLUMNS = 5;
const GUTTER = 1.5;

const GalleryAllView: React.FC<{
  onLoadNextPage: () => Promise<void>;
  onRefresh: () => Promise<void>;
  photos: DataProvider;
}> = ({ onLoadNextPage, onRefresh, photos }) => {
  const photosCtx = useContext(PhotosContext);
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();

  const [refreshing, setRefreshing] = useState(false);

  const itemSizeNoGutter = useMemo(() => {
    const itemSize = Dimensions.get('window').width / COLUMNS;

    // On Android we need to do this, otherwise
    // the items won't fit the row
    if (Platform.OS === 'android') {
      return Math.floor(itemSize);
    }

    return itemSize;
  }, []);
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
      navigation.navigate('PhotosPreview', { photosItem });
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
      dimensions.width = itemSizeNoGutter;
      dimensions.height = itemSizeNoGutter;
    },
  );

  layoutProvider.shouldRefreshWithAnchoring = false;

  function renderRow(_: unknown, data: PhotosItem, index: number) {
    const isFirst = index % COLUMNS === 0;
    return (
      <View
        style={{
          width: itemSizeNoGutter,
          height: itemSizeNoGutter,
          paddingBottom: GUTTER,
          paddingLeft: isFirst ? 0 : GUTTER,
        }}
      >
        <GalleryItem data={data} onPress={onItemPressed} />
      </View>
    );
  }

  function renderFooter() {
    return <></>;
  }

  return (
    <View style={{ flex: 1 }}>
      <RecyclerListView
        optimizeForInsertDeleteAnimations={true}
        onEndReached={onScrollEnd}
        layoutProvider={layoutProvider}
        rowRenderer={renderRow}
        dataProvider={photos}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderFooter={renderFooter}
        scrollThrottle={16}
      />
    </View>
  );
};

export const GalleryAllSkeleton = () => {
  const tailwind = useTailwind();
  const [fadeAnim] = useState(new Animated.Value(1));

  Animated.loop(
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.4,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]),
  ).start();
  const itemSizeNoGutter = useMemo(() => {
    const itemSize = Dimensions.get('window').width / COLUMNS;

    // On Android we need to do this, otherwise
    // the items won't fit the row
    if (Platform.OS === 'android') {
      return Math.floor(itemSize);
    }

    return itemSize;
  }, []);

  return (
    <View style={tailwind('flex-1')}>
      {_.times(10).map((row, rowIndex) => {
        return (
          <View style={tailwind('w-full flex flex-row')} key={`row-${rowIndex}`}>
            {_.times(COLUMNS).map((_, index) => {
              const shouldAddSpace = index % COLUMNS < COLUMNS - 1;

              return (
                <Animated.View
                  key={index}
                  style={[
                    {
                      marginEnd: shouldAddSpace ? GUTTER : 0,
                      marginBottom: GUTTER,
                      width: itemSizeNoGutter,
                      height: itemSizeNoGutter,
                      opacity: fadeAnim,
                    },
                    tailwind('bg-gray-5'),
                  ]}
                ></Animated.View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

export default GalleryAllView;
