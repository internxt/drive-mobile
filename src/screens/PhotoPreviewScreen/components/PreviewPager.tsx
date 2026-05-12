import { useCallback, useEffect, useRef } from 'react';
import { FlatList, ListRenderItem, useWindowDimensions } from 'react-native';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { PreviewPage } from './PreviewPage';

interface PreviewPagerProps {
  items: TimelinePhotoItem[];
  initialIndex: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onSwipeDown: () => void;
}

export const PreviewPager = ({
  items,
  initialIndex,
  activeIndex,
  onIndexChange,
  onTap,
  onZoomChange,
  onSwipeDown,
}: PreviewPagerProps): JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<TimelinePhotoItem>>(null);

  useEffect(() => {
    const isIndexOutOfBounds = activeIndex < 0 || activeIndex >= items.length;
    if (isIndexOutOfBounds) {
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true });
  }, [activeIndex, items.length]);

  const renderItem: ListRenderItem<TimelinePhotoItem> = useCallback(
    ({ item }) => <PreviewPage item={item} onTap={onTap} onZoomChange={onZoomChange} onSwipeDown={onSwipeDown} />,
    [onTap, onZoomChange, onSwipeDown],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<TimelinePhotoItem> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  );

  const onMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
      onIndexChange(index);
    },
    [screenWidth, onIndexChange],
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={getItemLayout}
      onMomentumScrollEnd={onMomentumScrollEnd}
      removeClippedSubviews
      maxToRenderPerBatch={3}
      windowSize={3}
    />
  );
};
