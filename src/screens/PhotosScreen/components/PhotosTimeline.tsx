import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { PhotoBackupState, PhotoDateGroup, TimelinePhotoItem } from '../types';
import { GroupBoundary, buildFlatTimeline, findGroupForIndex } from '../utils/photoTimelineGroups';
import PhotosGroupHeader, { GroupSyncStatus } from './GroupHeader/PhotosGroupHeader';
import PhotoItem from './PhotoItem';
import PhotosEmptyState from './PhotosEmptyState';

export interface PhotosTimelineHandle {
  scrollToAssetId: (id: string) => void;
}

export type TimelineDateGroup = { group: PhotoDateGroup; syncStatus: GroupSyncStatus };

const SKELETON_GROUP: TimelineDateGroup = {
  group: {
    id: '__skeleton__',
    label: '',
    photos: Array.from({ length: 12 }, (_, i) => ({
      id: `__skeleton_${i}__`,
      type: 'local' as const,
      createdAt: 0,
      backupState: 'loading' as PhotoBackupState,
      mediaType: 'photo' as const,
    })),
  },
  syncStatus: { type: 'none' },
};

const NUM_COLUMNS = 3;
const HEADER_HEIGHT = 64; // h-16

interface PhotosTimelineProps {
  assetsGroupsByDate: TimelineDateGroup[];
  isLoading?: boolean;
  onPhotoPress?: (id: string) => void;
  onPhotoLongPress?: (id: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  ListHeaderComponent?: React.ReactElement;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onPausePress?: () => void;
  onResumePress?: () => void;
  onRetryPress?: () => void;
}

const keyExtractor = (item: TimelinePhotoItem) => item.id;

const PhotosTimeline = forwardRef<PhotosTimelineHandle, PhotosTimelineProps>(
  (
    {
      assetsGroupsByDate,
      isLoading,
      onPhotoPress,
      onPhotoLongPress,
      isSelectMode,
      selectedIds,
      ListHeaderComponent,
      onEndReached,
      refreshing,
      onRefresh,
      onPausePress,
      onResumePress,
      onRetryPress,
    },
    ref,
  ) => {
    const tailwind = useTailwind();

    const { photos, boundaries } = useMemo(() => {
      const effectiveGroups = isLoading ? [...assetsGroupsByDate, SKELETON_GROUP] : assetsGroupsByDate;
      return buildFlatTimeline(effectiveGroups);
    }, [assetsGroupsByDate, isLoading]);

    const [topGroupId, setTopGroupId] = useState<string | undefined>(() => boundaries[0]?.id);

    const flashListRef = useRef<any>(null);
    const boundariesRef = useRef<GroupBoundary[]>(boundaries);
    boundariesRef.current = boundaries;

    const scrollY = useRef(new Animated.Value(0)).current;
    // UIKit drops touches below alpha 0.01, so use 0.02 as the floor so pause/resume buttons
    // are always touchable even when the floating layer is nearly invisible at scroll=0.
    const floatingOpacity = scrollY.interpolate({ inputRange: [0, 24], outputRange: [0.02, 1], extrapolate: 'clamp' });
    const solidOpacity = scrollY.interpolate({ inputRange: [0, 24], outputRange: [1, 0], extrapolate: 'clamp' });

    const extraData = useMemo(
      () => ({ isSelectMode, selectedIds, onPausePress, onResumePress, onRetryPress }),
      [isSelectMode, selectedIds, onPausePress, onResumePress, onRetryPress],
    );

    const idToIndex = useMemo(() => {
      const map = new Map<string, number>();
      photos.forEach((photo, index) => map.set(photo.id, index));
      return map;
    }, [photos]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToAssetId: (id: string) => {
          const index = idToIndex.get(id);
          if (index === undefined) return;
          flashListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
        },
      }),
      [idToIndex],
    );

    const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
        if (viewableItems.length === 0) {
          return;
        }
        const topIndex = viewableItems[0].index ?? 0;
        const group = findGroupForIndex(boundariesRef.current, topIndex);
        if (group) {
          setTopGroupId((prev) => (prev === group.id ? prev : group.id));
        }
      },
      [],
    );

    const renderItem: ListRenderItem<TimelinePhotoItem> = useCallback(
      ({ item }) => (
        <View style={[tailwind('flex-1'), { aspectRatio: 1, margin: 1 }]}>
          <PhotoItem
            item={item}
            isSelectMode={isSelectMode}
            isSelected={selectedIds?.has(item.id)}
            onPress={onPhotoPress}
            onLongPress={onPhotoLongPress}
          />
        </View>
      ),
      [isSelectMode, selectedIds, onPhotoPress, onPhotoLongPress, tailwind],
    );

    const isEmpty = !isLoading && assetsGroupsByDate.length === 0;
    const currentBoundary = boundaries.find((b) => b.id === topGroupId) ?? boundaries[0];
    const overlaySyncStatus: GroupSyncStatus = isSelectMode
      ? { type: 'selection', count: selectedIds?.size ?? 0 }
      : currentBoundary?.syncStatus ?? { type: 'none' };

    return (
      <View style={tailwind('flex-1')}>
        <FlashList
          ref={flashListRef}
          data={photos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          extraData={extraData}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={isEmpty ? <PhotosEmptyState /> : undefined}
          contentContainerStyle={
            isEmpty ? { paddingBottom: 80, flexGrow: 1 } : { paddingTop: HEADER_HEIGHT, paddingBottom: 80 }
          }
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        />

        {!isEmpty && currentBoundary && (
          <>
            {/* Solid layer: visible at scroll=0, fades out as user scrolls. Decorative only. */}
            <Animated.View pointerEvents="none" style={[styles.headerOverlay, { opacity: solidOpacity }]}>
              <PhotosGroupHeader
                label={currentBoundary.label}
                syncStatus={overlaySyncStatus}
                isSticky={false}
              />
            </Animated.View>
            {/* Floating layer: transparent at scroll=0, fades in as user scrolls. Interactive. */}
            <Animated.View style={[styles.headerOverlay, { opacity: floatingOpacity }]}>
              <PhotosGroupHeader
                label={currentBoundary.label}
                syncStatus={overlaySyncStatus}
                isSticky
                onPausePress={onPausePress}
                onResumePress={onResumePress}
                onRetryPress={onRetryPress}
              />
            </Animated.View>
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default PhotosTimeline;
