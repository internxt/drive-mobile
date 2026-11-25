import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useCallback } from 'react';
import { FlatList, ListRenderItem, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions } from 'react-native';

const RENDERED_PAGES_WINDOW = 3;
const INITIAL_RENDERED_PAGES = 1;

interface DrivePreviewPagerProps {
  previewFiles: DriveItemData[];
  initialIndex: number;
  scrollEnabled: boolean;
  renderPreviewPage: (driveFile: DriveItemData, index: number) => JSX.Element;
  onActiveIndexChange: (index: number) => void;
}

export const DrivePreviewPager = ({
  previewFiles,
  initialIndex,
  scrollEnabled,
  renderPreviewPage,
  onActiveIndexChange,
}: DrivePreviewPagerProps): JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();

  const renderItem: ListRenderItem<DriveItemData> = useCallback(
    ({ item, index }) => renderPreviewPage(item, index),
    [renderPreviewPage],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<DriveItemData> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onActiveIndexChange(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
    },
    [screenWidth, onActiveIndexChange],
  );

  return (
    <FlatList
      data={previewFiles}
      keyExtractor={(driveFile) => driveFile.uuid}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      scrollEnabled={scrollEnabled}
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={getItemLayout}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      removeClippedSubviews={false}
      windowSize={RENDERED_PAGES_WINDOW}
      initialNumToRender={INITIAL_RENDERED_PAGES}
      maxToRenderPerBatch={RENDERED_PAGES_WINDOW}
    />
  );
};
