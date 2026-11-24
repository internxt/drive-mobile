import { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  AnimatedRef,
  ReanimatedEvent,
  SharedValue,
  useAnimatedReaction,
  useEvent,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TimelinePhotoItem } from '../types';
import { GroupBoundary } from '../utils/photoTimelineGroups';
import {
  buildTimelineDateIndex,
  getOffsetForIndex,
  getRailAnchorForScroll,
  getRowHeightFromContent,
} from '../utils/photoTimelineLayout';

const SCRUBBER_IDLE_HIDE_MS = 1500;
const SCRUBBER_RELEASE_SETTLE_PX = 2;
const SCRUBBER_RELEASE_TIMEOUT_MS = 400;
const SCRUBBER_FADE_MS = 200;
const SCRUBBER_RESCALE_MS = 250;
const SCRUBBER_MIN_SCROLLABLE_SCREENS = 2;

const LIST_SCROLL_EVENT_NAMES = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export const SCRUBBER_RAIL_WIDTH = 56;
export const SCRUBBER_HANDLE_SIZE = 44;
export const SCRUBBER_HANDLE_HIT_MARGIN = 12;
export const SCRUBBER_YEAR_MARKER_HEIGHT = 24;

const SCRUBBER_RAIL_TOP_INSET = 72;
const SCRUBBER_RAIL_BOTTOM_INSET = 32;
const SCRUBBER_YEAR_LABEL_MIN_GAP = 28;

export interface ScrubberYearMarker {
  label: string;
  y: number;
}

/** Content height reported by the list, with the item count it was measured for. */
export interface MeasuredTimelineContent {
  height: number;
  itemCount: number;
}

interface PhotosScrubberConfig {
  listRef: AnimatedRef<FlashListRef<TimelinePhotoItem>>;
  boundaries: GroupBoundary[];
  itemCount: number;
  measuredContent: MeasuredTimelineContent;
  contentTopInset: number;
  containerHeight: number;
  numColumns: number;
  listPaddingBottom: number;
  isEnabled: boolean;
}

/** Values shared between the gesture worklets, the animated styles and the JS thread. */
export interface ScrubberDragValues {
  /** Rail length in pixels. The handle's centre is clamped to [0, railHeight]. */
  railHeight: SharedValue<number>;
  /** Maximum scroll offset the rail maps to. Only changes while no drag is in progress. */
  maxScroll: SharedValue<number>;
  /** List scroll offset, written on the UI thread by the list's scroll events. */
  scrollOffset: SharedValue<number>;
  /** Scroll offsets at which each month starts, ascending. Indexes match monthLabels. */
  monthOffsets: SharedValue<number[]>;
  /** Label of each month, such as "Mar 2025". */
  monthLabels: SharedValue<string[]>;
  /** Whether the handle is pinned to startCenterY + translateY instead of following the scroll.
   *  Stays true after the finger lifts until isReleasing resolves. */
  isDragging: SharedValue<boolean>;
  /** Whether a finger is holding the handle. */
  isTouching: SharedValue<boolean>;
  /** True between lifting the finger and the list reaching the offset the drag asked for. */
  isReleasing: SharedValue<boolean>;
  /** Where the handle's centre sat when the current drag began. */
  startCenterY: SharedValue<number>;
  /** Clamped finger displacement since the drag began. */
  translateY: SharedValue<number>;
  /** Pixels added to the scroll-driven handle position, animated back to 0 after a release that
   *  did not settle. */
  idleCorrection: SharedValue<number>;
  /** Increases on every grab. Callbacks carrying an older value belong to a finished drag. */
  dragCount: SharedValue<number>;
  /** Drag count of the last drag whose end was handled. */
  endedDragCount: SharedValue<number>;
  /** Index into monthOffsets of the month under the handle during a drag, or -1. */
  monthIndex: SharedValue<number>;
  /** Time of the last scroll command sent during the drag. */
  lastScrollCommandTimeMs: SharedValue<number>;
  opacity: SharedValue<number>;
}

export interface PhotosScrubberResult {
  isAvailable: boolean;
  listRef: AnimatedRef<FlashListRef<TimelinePhotoItem>>;
  railTop: number;
  railHeight: number;
  rowHeight: number;
  drag: ScrubberDragValues;
  yearMarkers: ScrubberYearMarker[];
  onScrubStart: (dragCount: number) => void;
  onScrubEnd: (dragCount: number) => void;
}

interface RailMetrics {
  maxScroll: number;
  yearMarkers: ScrubberYearMarker[];
  monthOffsets: number[];
  monthLabels: string[];
}

const clampFraction = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Whether the user is moving the list after a native scroll event: from the start of a drag until it
 * ends, and again while the momentum of that drag lasts. Other events leave it unchanged.
 */
export const getUserScrollingAfterEvent = (eventName: string, wasUserScrolling: boolean): boolean => {
  'worklet';
  if (eventName.endsWith('onScrollBeginDrag') || eventName.endsWith('onMomentumScrollBegin')) {
    return true;
  }
  if (eventName.endsWith('onScrollEndDrag') || eventName.endsWith('onMomentumScrollEnd')) {
    return false;
  }
  return wasUserScrolling;
};

/** Shows at once if hidden, then fades out after the idle delay. */
const showThenHideAfterIdle = () => {
  'worklet';
  return withSequence(
    withTiming(1, { duration: SCRUBBER_FADE_MS }),
    withDelay(SCRUBBER_IDLE_HIDE_MS, withTiming(0, { duration: SCRUBBER_FADE_MS })),
  );
};

export const hideAfterIdle = () => {
  'worklet';
  return withDelay(SCRUBBER_IDLE_HIDE_MS, withTiming(0, { duration: SCRUBBER_FADE_MS }));
};

interface ListScrollEventRegistration {
  workletEventHandler: {
    registerForEvents: (viewTag: number) => void;
    unregisterFromEvents: (viewTag: number) => void;
  };
}

export const usePhotosScrubber = ({
  listRef,
  boundaries,
  itemCount,
  measuredContent,
  contentTopInset,
  containerHeight,
  numColumns,
  listPaddingBottom,
  isEnabled,
}: PhotosScrubberConfig): PhotosScrubberResult => {
  const [isScrubbing, setIsScrubbing] = useState(false);

  const isScrubbingRef = useRef(isScrubbing);
  isScrubbingRef.current = isScrubbing;

  const railHeight = Math.max(0, containerHeight - SCRUBBER_RAIL_TOP_INSET - SCRUBBER_RAIL_BOTTOM_INSET);

  const rowHeight = getRowHeightFromContent({
    contentHeight: measuredContent.height,
    itemCount: measuredContent.itemCount,
    contentTopInset,
    paddingBottom: listPaddingBottom,
    numColumns,
  });
  const contentHeight = contentTopInset + Math.ceil(itemCount / numColumns) * rowHeight + listPaddingBottom;
  const maxScroll = Math.max(1, contentHeight - containerHeight);

  const isAvailable =
    isEnabled &&
    itemCount > 0 &&
    railHeight > 0 &&
    rowHeight > 0 &&
    contentHeight > containerHeight * SCRUBBER_MIN_SCROLLABLE_SCREENS;

  const isAvailableShared = useSharedValue(isAvailable);

  const { yearAnchors, monthAnchors } = useMemo(() => buildTimelineDateIndex(boundaries), [boundaries]);

  const liveRailMetrics = useMemo((): RailMetrics => {
    const yearMarkers: ScrubberYearMarker[] = [];
    let lastKeptY = Number.NEGATIVE_INFINITY;

    for (const anchor of yearAnchors) {
      const offset = getOffsetForIndex({ index: anchor.startIndex, rowHeight, contentTopInset, numColumns });
      const y = clampFraction(offset / maxScroll) * railHeight;
      if (y - lastKeptY < SCRUBBER_YEAR_LABEL_MIN_GAP) {
        continue;
      }
      yearMarkers.push({ label: anchor.label, y });
      lastKeptY = y;
    }

    const monthOffsets = monthAnchors.map((anchor) =>
      getOffsetForIndex({ index: anchor.startIndex, rowHeight, contentTopInset, numColumns }),
    );

    const monthLabels = monthAnchors.map((anchor) => anchor.label);

    return { maxScroll, yearMarkers, monthOffsets, monthLabels };
  }, [yearAnchors, monthAnchors, rowHeight, contentTopInset, numColumns, maxScroll, railHeight]);

  // The rail keeps the scale the drag started with until the drag ends.
  const frozenRailMetricsRef = useRef(liveRailMetrics);
  if (!isScrubbing) {
    frozenRailMetricsRef.current = liveRailMetrics;
  }
  const railMetrics = frozenRailMetricsRef.current;

  const scrollOffset = useSharedValue(0);
  const opacity = useSharedValue(0);
  const isUserScrolling = useSharedValue(false);
  const dragTranslateY = useSharedValue(0);
  const dragStartCenterY = useSharedValue(0);
  const isDraggingShared = useSharedValue(false);
  const isReleasingShared = useSharedValue(false);
  const isTouchingShared = useSharedValue(false);
  const dragIdleCorrection = useSharedValue(0);
  const dragCountShared = useSharedValue(0);
  const endedDragCountShared = useSharedValue(0);
  const dragMonthIndex = useSharedValue(-1);
  const lastScrollCommandTimeMsShared = useSharedValue(0);
  const railHeightShared = useSharedValue(0);
  const maxScrollShared = useSharedValue(0);
  const pendingMaxScroll = useSharedValue(0);
  const monthOffsetsShared = useSharedValue<number[]>([]);
  const monthLabelsShared = useSharedValue<string[]>([]);

  const drag = useMemo(
    (): ScrubberDragValues => ({
      railHeight: railHeightShared,
      maxScroll: maxScrollShared,
      scrollOffset,
      monthOffsets: monthOffsetsShared,
      monthLabels: monthLabelsShared,
      isDragging: isDraggingShared,
      isReleasing: isReleasingShared,
      isTouching: isTouchingShared,
      startCenterY: dragStartCenterY,
      translateY: dragTranslateY,
      idleCorrection: dragIdleCorrection,
      dragCount: dragCountShared,
      endedDragCount: endedDragCountShared,
      monthIndex: dragMonthIndex,
      lastScrollCommandTimeMs: lastScrollCommandTimeMsShared,
      opacity,
    }),
    [
      railHeightShared,
      maxScrollShared,
      scrollOffset,
      monthOffsetsShared,
      monthLabelsShared,
      isDraggingShared,
      isReleasingShared,
      isTouchingShared,
      dragStartCenterY,
      dragTranslateY,
      dragIdleCorrection,
      dragCountShared,
      endedDragCountShared,
      dragMonthIndex,
      lastScrollCommandTimeMsShared,
      opacity,
    ],
  );

  const listScrollEvents = useEvent<NativeSyntheticEvent<NativeScrollEvent>>(
    (event: ReanimatedEvent<NativeSyntheticEvent<NativeScrollEvent>>) => {
      'worklet';
      scrollOffset.value = event.contentOffset.y;
      isUserScrolling.value = getUserScrollingAfterEvent(event.eventName, isUserScrolling.value);
      if (isUserScrolling.value && isAvailableShared.value && !isDraggingShared.value) {
        opacity.value = showThenHideAfterIdle();
      }
    },
    LIST_SCROLL_EVENT_NAMES,
  ) as unknown as ListScrollEventRegistration;

  // Same registration as Reanimated's useScrollOffset, which only reports the offset.
  useEffect(
    () =>
      listRef.observe((viewTag) => {
        if (typeof viewTag !== 'number') {
          return;
        }
        listScrollEvents.workletEventHandler.registerForEvents(viewTag);
        return () => listScrollEvents.workletEventHandler.unregisterFromEvents(viewTag);
      }),
    [listRef, listScrollEvents],
  );

  useEffect(() => {
    railHeightShared.value = railHeight;
  }, [railHeight, railHeightShared]);

  useEffect(() => {
    isAvailableShared.value = isAvailable;
  }, [isAvailable, isAvailableShared]);

  useEffect(() => {
    pendingMaxScroll.value = railMetrics.maxScroll;
    monthOffsetsShared.value = railMetrics.monthOffsets;
    monthLabelsShared.value = railMetrics.monthLabels;
  }, [railMetrics, pendingMaxScroll, monthOffsetsShared, monthLabelsShared]);

  // Applies a new scale only while no drag is in progress, gliding the handle to its new place.
  useAnimatedReaction(
    () => ({ nextMaxScroll: pendingMaxScroll.value, isDragging: isDraggingShared.value }),
    ({ nextMaxScroll, isDragging }) => {
      if (isDragging || nextMaxScroll === maxScrollShared.value) {
        return;
      }
      maxScrollShared.value =
        maxScrollShared.value <= 1 ? nextMaxScroll : withTiming(nextMaxScroll, { duration: SCRUBBER_RESCALE_MS });
    },
  );

  // Hands the handle back to the scroll once the list reaches the offset the drag asked for.
  useAnimatedReaction(
    () => ({
      scrollAnchor: getRailAnchorForScroll({
        scrollY: scrollOffset.value,
        maxScroll: maxScrollShared.value,
        railHeight: railHeightShared.value,
      }),
      isReleasing: isReleasingShared.value,
      releaseCenterY: dragStartCenterY.value,
    }),
    ({ scrollAnchor, isReleasing, releaseCenterY }) => {
      if (!isReleasing || Math.abs(scrollAnchor - releaseCenterY) > SCRUBBER_RELEASE_SETTLE_PX) {
        return;
      }
      isReleasingShared.value = false;
      isDraggingShared.value = false;
    },
  );

  const activeDragCountRef = useRef(0);

  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimeout = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  const onScrubStart = useCallback(
    (dragCount: number) => {
      activeDragCountRef.current = dragCount;
      clearReleaseTimeout();
      setIsScrubbing(true);
    },
    [clearReleaseTimeout],
  );

  const onScrubEnd = useCallback(
    (dragCount: number) => {
      if (dragCount !== activeDragCountRef.current) {
        return;
      }
      clearReleaseTimeout();
      releaseTimeoutRef.current = setTimeout(() => {
        releaseTimeoutRef.current = null;
        if (dragCount !== dragCountShared.value || !isReleasingShared.value) {
          return;
        }
        const scrollAnchor = getRailAnchorForScroll({
          scrollY: scrollOffset.value,
          maxScroll: maxScrollShared.value,
          railHeight: railHeightShared.value,
        });
        dragIdleCorrection.value = dragStartCenterY.value - scrollAnchor;
        isReleasingShared.value = false;
        isDraggingShared.value = false;
        dragIdleCorrection.value = withTiming(0, { duration: SCRUBBER_RESCALE_MS });
      }, SCRUBBER_RELEASE_TIMEOUT_MS);

      setIsScrubbing(false);
    },
    [
      clearReleaseTimeout,
      scrollOffset,
      maxScrollShared,
      railHeightShared,
      dragCountShared,
      isReleasingShared,
      isDraggingShared,
      dragIdleCorrection,
      dragStartCenterY,
    ],
  );

  useEffect(() => {
    if (isAvailable) {
      return;
    }
    clearReleaseTimeout();
    dragCountShared.value += 1;
    activeDragCountRef.current = dragCountShared.value;
    isDraggingShared.value = false;
    isReleasingShared.value = false;
    isTouchingShared.value = false;
    dragTranslateY.value = 0;
    dragIdleCorrection.value = 0;
    opacity.value = 0;
    setIsScrubbing(false);
  }, [
    isAvailable,
    clearReleaseTimeout,
    dragCountShared,
    isDraggingShared,
    isReleasingShared,
    isTouchingShared,
    dragTranslateY,
    dragIdleCorrection,
    opacity,
  ]);

  useEffect(() => clearReleaseTimeout, [clearReleaseTimeout]);

  return {
    isAvailable,
    listRef,
    railTop: SCRUBBER_RAIL_TOP_INSET,
    railHeight,
    rowHeight,
    drag,
    yearMarkers: railMetrics.yearMarkers,
    onScrubStart,
    onScrubEnd,
  };
};
