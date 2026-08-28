import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTailwind } from 'tailwind-rn';
import { ScrubbingContext } from '../context/ScrubbingContext';
import { useDragSelectGesture } from '../hooks/useDragSelectGesture';
import { usePhotosScrubber } from '../hooks/usePhotosScrubber';
import { PhotoBackupState, PhotoDateGroup, TimelinePhotoItem } from '../types';
import { GroupBoundary, buildFlatTimeline, findGroupForIndex } from '../utils/photoTimelineGroups';
import PhotosGroupHeader, { GroupSyncStatus } from './GroupHeader/PhotosGroupHeader';
import PhotoItem from './PhotoItem';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosScrubber from './PhotosScrubber';

export interface PhotosTimelineHandle {
  scrollToAssetId: (id: string) => void;
  scrollToTop: () => void;
}

export type TimelineDateGroup = { group: PhotoDateGroup; syncStatus: GroupSyncStatus };

const resolveOverlaySyncStatus = ({
  isSelectMode,
  selectedCount,
  isAtListTop,
  currentSyncStatus,
  totalAssetsCount,
}: {
  isSelectMode: boolean;
  selectedCount: number;
  isAtListTop: boolean;
  currentSyncStatus: GroupSyncStatus;
  totalAssetsCount: number;
}): GroupSyncStatus => {
  if (isSelectMode) {
    return { type: 'selection', count: selectedCount };
  }

  if (isAtListTop && currentSyncStatus.type === 'count') {
    return { type: 'count', count: totalAssetsCount };
  }

  return currentSyncStatus;
};

const SKELETON_GROUP: TimelineDateGroup = {
  group: {
    id: '__skeleton__',
    label: '',
    photos: Array.from({ length: 12 }, (_, i) => ({
      id: `__skeleton_${i}__`,
      type: 'local' as const,
      createdAt: 0,
      modificationTime: 0,
      backupState: 'loading' as PhotoBackupState,
      mediaType: 'photo' as const,
    })),
  },
  syncStatus: { type: 'none' },
};

const NUM_COLUMNS = 3;
const HEADER_HEIGHT = 64;
const HEADER_FADE_SCROLL_DISTANCE = 24;
const FLOATING_HEADER_MIN_OPACITY = 0.02;
const PULL_TO_REFRESH_FADE_START = -10;
const PULL_TO_REFRESH_FADE_END = -60;
const LIST_PADDING_BOTTOM = 80;

// Hoisted so the FlashList does not see a new object identity on every render.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };
const MAINTAIN_VISIBLE_CONTENT_POSITION = { disabled: true } as const;
const CONTENT_STYLE_EMPTY = { paddingBottom: LIST_PADDING_BOTTOM, flexGrow: 1 };
const CONTENT_STYLE = { paddingTop: HEADER_HEIGHT, paddingBottom: LIST_PADDING_BOTTOM };
const CONTENT_STYLE_REFRESHING = { paddingTop: 0, paddingBottom: LIST_PADDING_BOTTOM };

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
  onDragBegin?: (index: number) => void;
  onDragUpdate?: (index: number) => void;
  onDragEnd?: () => void;
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
      onDragBegin,
      onDragUpdate,
      onDragEnd,
    },
    ref,
  ) => {
    const tailwind = useTailwind();

    const { photos, boundaries } = useMemo(() => {
      const effectiveGroups = isLoading ? [...assetsGroupsByDate, SKELETON_GROUP] : assetsGroupsByDate;
      return buildFlatTimeline(effectiveGroups);
    }, [assetsGroupsByDate, isLoading]);

    const [topGroupId, setTopGroupId] = useState<string | undefined>(() => boundaries[0]?.id);
    const [isAtListTop, setIsAtListTop] = useState(true);

    const totalAssetsCount = useMemo(
      () => assetsGroupsByDate.reduce((sum, { group }) => sum + group.photos.length, 0),
      [assetsGroupsByDate],
    );

    const flashListRef = useRef<FlashListRef<TimelinePhotoItem>>(null);
    const boundariesRef = useRef<GroupBoundary[]>(boundaries);
    boundariesRef.current = boundaries;

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [listHeaderHeight, setListHeaderHeight] = useState(0);

    const onListHeaderLayout = useCallback(
      (e: LayoutChangeEvent) => setListHeaderHeight(e.nativeEvent.layout.height),
      [],
    );

    useEffect(() => {
      if (!ListHeaderComponent) {
        setListHeaderHeight(0);
      }
    }, [ListHeaderComponent]);

    const cellSize = containerSize.width / NUM_COLUMNS;
    const contentTopInset = HEADER_HEIGHT + listHeaderHeight;

    const scrollY = useRef(new Animated.Value(0)).current;
    // UIKit drops touches below alpha 0.01, so use FLOATING_HEADER_MIN_OPACITY as the floor so
    // pause/resume buttons are always touchable even when the floating layer is nearly invisible
    // at scroll=0.
    const floatingOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_FADE_SCROLL_DISTANCE],
      outputRange: [FLOATING_HEADER_MIN_OPACITY, 1],
      extrapolate: 'clamp',
    });
    const solidOpacity = scrollY.interpolate({
      inputRange: [PULL_TO_REFRESH_FADE_END, PULL_TO_REFRESH_FADE_START, 0, HEADER_FADE_SCROLL_DISTANCE],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });

    const {
      gesture,
      onContainerLayout,
      onScroll: onDragSelectScroll,
      scrollOffsetRef,
    } = useDragSelectGesture({
      isSelectMode: !!isSelectMode,
      photos,
      scrollY,
      flashListRef,
      headerHeight: HEADER_HEIGHT,
      numColumns: NUM_COLUMNS,
      onDragBegin,
      onDragUpdate,
      onDragEnd,
    });

    const scrollToOffset = useCallback((offset: number) => {
      flashListRef.current?.scrollToOffset({ offset, animated: false });
    }, []);

    const scrubber = usePhotosScrubber({
      scrollY,
      boundaries,
      itemCount: photos.length,
      cellSize,
      contentTopInset,
      containerHeight: containerSize.height,
      numColumns: NUM_COLUMNS,
      listPaddingBottom: LIST_PADDING_BOTTOM,
      isEnabled: !isSelectMode,
      scrollToOffset,
    });

    const onScroll = useCallback(
      (e: Parameters<typeof onDragSelectScroll>[0]) => {
        onDragSelectScroll(e);
        scrubber.notifyScroll();
      },
      // notifyScroll specifically, not `scrubber`, which is a new object literal every render.
      [onDragSelectScroll, scrubber.notifyScroll],
    );

    const onContainerLayoutMerged = useCallback(
      (e: LayoutChangeEvent) => {
        onContainerLayout(e);
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      },
      [onContainerLayout],
    );

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
          if (index === undefined) {
            return;
          }
          flashListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
        },
        scrollToTop: () => {
          flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
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
        setIsAtListTop((prev) => (prev === (topIndex === 0) ? prev : topIndex === 0));
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

    const isIosRefreshing = Platform.OS === 'ios' && !!refreshing;

    const wasIosRefreshingRef = useRef(isIosRefreshing);
    useEffect(() => {
      if (wasIosRefreshingRef.current && !isIosRefreshing) {
        flashListRef.current?.scrollToOffset({
          offset: scrollOffsetRef.current,
          animated: false,
        });
      }
      wasIosRefreshingRef.current = isIosRefreshing;
    }, [isIosRefreshing]);

    const isEmpty = !isLoading && assetsGroupsByDate.length === 0;

    // boundaries holds one entry per day, so this scan is long in a large library.
    const currentBoundary = useMemo(
      () => boundaries.find((b) => b.id === topGroupId) ?? boundaries[0],
      [boundaries, topGroupId],
    );

    const overlaySyncStatus = useMemo(
      () =>
        resolveOverlaySyncStatus({
          isSelectMode: !!isSelectMode,
          selectedCount: selectedIds?.size ?? 0,
          isAtListTop,
          currentSyncStatus: currentBoundary?.syncStatus ?? { type: 'none' },
          totalAssetsCount,
        }),
      [isSelectMode, selectedIds, isAtListTop, currentBoundary, totalAssetsCount],
    );

    const contentContainerStyle = isEmpty
      ? CONTENT_STYLE_EMPTY
      : isIosRefreshing
        ? CONTENT_STYLE_REFRESHING
        : CONTENT_STYLE;

    const measuredListHeader = ListHeaderComponent ? (
      <View onLayout={onListHeaderLayout}>{ListHeaderComponent}</View>
    ) : undefined;

    return (
      <ScrubbingContext.Provider value={scrubber.isScrubbing}>
        <GestureDetector gesture={gesture}>
          <View style={tailwind('flex-1')} onLayout={onContainerLayoutMerged}>
            <FlashList
              ref={flashListRef}
              data={photos}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={NUM_COLUMNS}
              extraData={extraData}
              ListHeaderComponent={measuredListHeader}
              ListEmptyComponent={isEmpty ? <PhotosEmptyState /> : undefined}
              contentContainerStyle={contentContainerStyle}
              showsVerticalScrollIndicator={false}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={VIEWABILITY_CONFIG}
              onScroll={onScroll}
              scrollEventThrottle={16}
              progressViewOffset={Platform.OS === 'android' ? HEADER_HEIGHT : 0}
              maintainVisibleContentPosition={MAINTAIN_VISIBLE_CONTENT_POSITION}
              drawDistance={500}
            />

            {!isEmpty && currentBoundary && (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.headerOverlay, { opacity: isIosRefreshing ? 0 : solidOpacity }]}
                >
                  <PhotosGroupHeader label={currentBoundary.label} syncStatus={overlaySyncStatus} isSticky={false} />
                </Animated.View>
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

            {!isEmpty && <PhotosScrubber scrubber={scrubber} />}
          </View>
        </GestureDetector>
      </ScrubbingContext.Provider>
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
