import { useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { TimelinePhotoItem } from '../types';

const DRAG_EDGE_THRESHOLD = 80;
const DRAG_MAX_SCROLL_SPEED = 12;
const MIN_AUTO_SCROLL_SPEED = 1;
const SCROLL_LOOP_INTERVAL_MS = 16;

interface DragSelectGestureConfig {
  isSelectMode: boolean;
  photos: TimelinePhotoItem[];
  scrollY: Animated.Value;
  flashListRef: React.RefObject<any>;
  headerHeight: number;
  numColumns: number;
  onDragBegin?: (index: number) => void;
  onDragUpdate?: (index: number) => void;
  onDragEnd?: () => void;
}

export const useDragSelectGesture = ({
  isSelectMode,
  photos,
  scrollY,
  flashListRef,
  headerHeight,
  numColumns,
  onDragBegin,
  onDragUpdate,
  onDragEnd,
}: DragSelectGestureConfig) => {
  // Live prop copies — updated every render so gesture closures always read current values
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const onDragBeginRef = useRef(onDragBegin);
  onDragBeginRef.current = onDragBegin;
  const onDragUpdateRef = useRef(onDragUpdate);
  onDragUpdateRef.current = onDragUpdate;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const containerWidthRef = useRef(0);
  const containerHeightRef = useRef(0);

  // Sync instead of scrollY.addListener: addListener fires with up to one frame of
  // JS-thread latency, enough to shift the hit-test by half a cell row during fast drags.
  const scrollYOffsetRef = useRef(0);

  // Kept in a ref so it's stable and can be called from the merged onScroll handler
  const scrollYAnimHandler = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
  ).current;

  const activeDragIndexRef = useRef<number | null>(null);
  const initialTouchPositionRef = useRef<{ x: number; y: number } | null>(null);

  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const autoScrollSpeedRef = useRef(0);

  const stopAutoScrollRef = useRef(() => {
    if (autoScrollIntervalRef.current !== null) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    autoScrollDirectionRef.current = null;
    autoScrollSpeedRef.current = 0;
  });

  // One shared loop reading direction/speed from refs on every tick so it reacts to
  // finger movement without being restarted each time the finger moves.
  const ensureScrollLoopRef = useRef(() => {
    if (autoScrollIntervalRef.current !== null) {
      return;
    }
    autoScrollIntervalRef.current = setInterval(() => {
      const direction = autoScrollDirectionRef.current;
      const speed = autoScrollSpeedRef.current;
      if (!direction || speed === 0) {
        return;
      }
      const currentOffset = scrollYOffsetRef.current;
      const nextOffset = direction === 'down' ? currentOffset + speed : Math.max(0, currentOffset - speed);
      flashListRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
    }, SCROLL_LOOP_INTERVAL_MS);
  });

  const maybeAutoScrollRef = useRef<(y: number) => void>(null!);
  maybeAutoScrollRef.current = (y: number) => {
    const height = containerHeightRef.current;
    if (height === 0) {
      stopAutoScrollRef.current();
      return;
    }
    if (y < DRAG_EDGE_THRESHOLD) {
      autoScrollDirectionRef.current = 'up';
      autoScrollSpeedRef.current = Math.max(
        MIN_AUTO_SCROLL_SPEED,
        Math.round(DRAG_MAX_SCROLL_SPEED * (1 - y / DRAG_EDGE_THRESHOLD)),
      );
      ensureScrollLoopRef.current();
    } else if (y > height - DRAG_EDGE_THRESHOLD) {
      autoScrollDirectionRef.current = 'down';
      const fromBottom = height - y;
      autoScrollSpeedRef.current = Math.max(
        MIN_AUTO_SCROLL_SPEED,
        Math.round(DRAG_MAX_SCROLL_SPEED * (1 - fromBottom / DRAG_EDGE_THRESHOLD)),
      );
      ensureScrollLoopRef.current();
    } else {
      stopAutoScrollRef.current();
    }
  };

  const pointToIndexRef = useRef((_x: number, _y: number): number | null => null);
  pointToIndexRef.current = (x: number, y: number): number | null => {
    const containerWidth = containerWidthRef.current;
    if (containerWidth === 0) {
      return null;
    }
    const cellSize = containerWidth / numColumns;
    // contentY is the y position inside the FlashList content (0 = top of first row),
    // accounting for the floating header overlay that sits above the grid.
    const contentY = scrollYOffsetRef.current + y - headerHeight;
    if (contentY < 0) {
      return null;
    }
    const row = Math.floor(contentY / cellSize);
    const col = Math.floor(x / cellSize);
    if (col < 0 || col >= numColumns) {
      return null;
    }
    const index = row * numColumns + col;
    const currentPhotos = photosRef.current;
    if (index < 0 || index >= currentPhotos.length) {
      return null;
    }
    if (currentPhotos[index].id.startsWith('__skeleton_')) {
      return null;
    }
    return index;
  };

  // Drag-select is iOS-only: on Android, Pan() conflicts with FlashList scroll in ways
  // that RNGH can't resolve cleanly, so the gesture is disabled there.
  const panGesture = useMemo(() => {
    const gestureBase = Gesture.Pan()
      .enabled(!!isSelectMode && Platform.OS !== 'android')
      .runOnJS(true);

    return gestureBase
      .onTouchesDown((event) => {
        const touch = event.changedTouches[0];
        if (touch) {
          initialTouchPositionRef.current = { x: touch.x, y: touch.y };
        }
      })
      .onStart((event) => {
        const initialPosition = initialTouchPositionRef.current ?? { x: event.x, y: event.y };
        initialTouchPositionRef.current = null;
        const index = pointToIndexRef.current(initialPosition.x, initialPosition.y);
        if (index !== null) {
          activeDragIndexRef.current = index;
          onDragBeginRef.current?.(index);
        }
      })
      .onUpdate((event) => {
        const index = pointToIndexRef.current(event.x, event.y);
        if (index !== null && index !== activeDragIndexRef.current) {
          activeDragIndexRef.current = index;
          onDragUpdateRef.current?.(index);
        }
        maybeAutoScrollRef.current(event.y);
      })
      .onEnd(() => {
        activeDragIndexRef.current = null;
        stopAutoScrollRef.current();
        onDragEndRef.current?.();
      })
      .onFinalize(() => {
        activeDragIndexRef.current = null;
        stopAutoScrollRef.current();
      });
  }, [isSelectMode]);

  const onContainerLayout = useRef((e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width;
    containerHeightRef.current = e.nativeEvent.layout.height;
  }).current;

  // Merges the sync offset capture with the Animated.event driver so scrollYOffsetRef
  // is always fresh when the gesture fires.
  const onScroll = useRef((e: any) => {
    scrollYOffsetRef.current = e.nativeEvent.contentOffset.y;
    scrollYAnimHandler(e);
  }).current;

  return { gesture: panGesture, onContainerLayout, onScroll };
};
