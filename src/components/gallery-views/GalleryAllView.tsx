import React, { useContext, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, RefreshControl, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import GalleryItem from '../GalleryItem';
import { PhotosScreenNavigationProp } from '../../types/navigation';
import { PhotosItem } from '../../types/photos';

import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { PhotosContext } from 'src/contexts/Photos';
import _ from 'lodash';
import { useTailwind } from 'tailwind-rn';

const COLUMNS = 3;
const GUTTER = 1.5;

const GalleryAllView: React.FC<{
  onRefresh: () => Promise<void>;
  photos: PhotosItem[];
}> = ({ onRefresh, photos }) => {
  const photosCtx = useContext(PhotosContext);
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();

  const GalleryFooter = useMemo(() => <></>, []);

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

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  function renderItem(info: ListRenderItemInfo<PhotosItem>) {
    const isFirst = info.index % COLUMNS === 0;
    const data = info.item;

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

  return (
    <View style={{ flex: 1 }}>
      <FlashList<PhotosItem>
        renderItem={renderItem}
        data={photos}
        estimatedItemSize={itemSizeNoGutter}
        numColumns={COLUMNS}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={GalleryFooter}
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
