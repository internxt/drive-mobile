import { useCallback, useEffect, useRef } from 'react';
import { FlatList, ListRenderItem, useWindowDimensions } from 'react-native';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { PreviewPage } from './PreviewPage';

interface PreviewPagerProps {
  items: TimelinePhotoItem[];
  initialIndex: number;
  activeIndex: number;
  isScrubbing: boolean;
  onIndexChange: (index: number) => void;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onSwipeDown: () => void;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoEnd?: () => void;
  videoResetKey?: number;
  hasVideoStarted?: boolean;
}

export const PreviewPager = ({
  items,
  initialIndex,
  activeIndex,
  isScrubbing,
  onIndexChange,
  onTap,
  onZoomChange,
  onSwipeDown,
  onVideoPlay,
  onVideoPause,
  onVideoEnd,
  videoResetKey,
  hasVideoStarted,
}: PreviewPagerProps): JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<TimelinePhotoItem>>(null);
  // Use a ref so the effect only re-runs on index changes, not on isScrubbing changes.
  // This prevents a spurious animated scroll (and its onMomentumScrollEnd) every time
  // scrubbing ends, which was causing an oscillation loop.
  const isScrubbingRef = useRef(isScrubbing);
  isScrubbingRef.current = isScrubbing;

  useEffect(() => {
    const isIndexOutOfBounds = activeIndex < 0 || activeIndex >= items.length;
    if (isIndexOutOfBounds) {
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex, animated: !isScrubbingRef.current });
  }, [activeIndex, items.length]);

  const renderItem: ListRenderItem<TimelinePhotoItem> = useCallback(
    ({ item }) => (
      <PreviewPage
        item={item}
        isScrubbing={isScrubbing}
        onTap={onTap}
        onZoomChange={onZoomChange}
        onSwipeDown={onSwipeDown}
        onVideoPlay={onVideoPlay}
        onVideoPause={onVideoPause}
        onVideoEnd={onVideoEnd}
        videoResetKey={videoResetKey}
        hasVideoStarted={hasVideoStarted}
      />
    ),
    [isScrubbing, onTap, onZoomChange, onSwipeDown, onVideoPlay, onVideoPause, onVideoEnd, videoResetKey, hasVideoStarted],
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
