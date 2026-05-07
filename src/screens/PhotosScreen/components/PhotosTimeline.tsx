import { FlashList, FlashListProps, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { PhotoBackupState, PhotoDateGroup } from '../types';
import { FlatItem, buildTimelineItems } from '../utils/photoTimelineGroups';
import PhotosGroupHeader, { GroupSyncStatus } from './GroupHeader/PhotosGroupHeader';
import PhotoItem from './PhotoItem';
import PhotosEmptyState from './PhotosEmptyState';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as React.ComponentType<
  FlashListProps<FlatItem> & { estimatedItemSize?: number }
>;

export type TimelineDateGroup = { group: PhotoDateGroup; syncStatus: GroupSyncStatus };

const SKELETON_GROUP: TimelineDateGroup = {
  group: {
    id: '__skeleton__',
    label: '',
    photos: Array.from({ length: 12 }, (_, i) => ({
      id: `__skeleton_${i}__`,
      type: 'local' as const,
      backupState: 'loading' as PhotoBackupState,
      mediaType: 'photo' as const,
    })),
  },
  syncStatus: { type: 'none' },
};

const NUM_COLUMNS = 3;
const ESTIMATED_ITEM_SIZE = Math.round(Dimensions.get('window').width / NUM_COLUMNS);

interface PhotosTimelineProps {
  assetsGroupsByDate: TimelineDateGroup[];
  isLoading?: boolean;
  onPhotoPress?: (id: string) => void;
  onPhotoLongPress?: (id: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  ListHeaderComponent?: React.ReactElement;
  onEndReached?: () => void;
}

const getItemType = (item: FlatItem) => item.type;

const overrideItemLayout = (layout: { span?: number }, item: FlatItem) => {
  if (item.type === 'header') {
    layout.span = NUM_COLUMNS;
  }
};

const keyExtractor = (item: FlatItem) => (item.type === 'header' ? `header-${item.id}` : item.photo.id);

const PhotosTimeline = ({
  assetsGroupsByDate,
  isLoading,
  onPhotoPress,
  onPhotoLongPress,
  isSelectMode,
  selectedIds,
  ListHeaderComponent,
  onEndReached,
}: PhotosTimelineProps) => {
  const tailwind = useTailwind();
  const { items, headerIndices } = useMemo(() => {
    const effectiveGroups = isLoading ? [...assetsGroupsByDate, SKELETON_GROUP] : assetsGroupsByDate;
    return buildTimelineItems(effectiveGroups);
  }, [assetsGroupsByDate, isLoading]);

  const extraData = useMemo(() => ({ isSelectMode, selectedIds }), [isSelectMode, selectedIds]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const stickyOpacity = useMemo(
    () => scrollY.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' }),
    [scrollY],
  );

  const renderItem: ListRenderItem<FlatItem> = useCallback(
    ({ item, target }) => {
      if (item.type === 'header') {
        const isSticky = target === 'StickyHeader';
        const showSyncStatus = isSticky || item.isFirst;
        return (
          <PhotosGroupHeader
            label={item.label}
            syncStatus={showSyncStatus ? item.syncStatus : { type: 'count', count: item.count }}
            isSticky={isSticky}
            stickyOpacity={isSticky ? stickyOpacity : undefined}
          />
        );
      }
      return (
        <View style={[tailwind('flex-1'), { aspectRatio: 1, margin: 1 }]}>
          <PhotoItem
            item={item.photo}
            isSelectMode={isSelectMode}
            isSelected={selectedIds?.has(item.photo.id)}
            onPress={onPhotoPress}
            onLongPress={onPhotoLongPress}
          />
        </View>
      );
    },
    [isSelectMode, selectedIds, onPhotoPress, onPhotoLongPress, stickyOpacity],
  );

  const isEmpty = !isLoading && assetsGroupsByDate.length === 0;

  return (
    <AnimatedFlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      estimatedItemSize={ESTIMATED_ITEM_SIZE}
      stickyHeaderIndices={headerIndices}
      getItemType={getItemType}
      overrideItemLayout={overrideItemLayout}
      extraData={extraData}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={isEmpty ? <PhotosEmptyState /> : undefined}
      contentContainerStyle={isEmpty ? { paddingBottom: 80, flexGrow: 1 } : { paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
    />
  );
};

export default PhotosTimeline;
