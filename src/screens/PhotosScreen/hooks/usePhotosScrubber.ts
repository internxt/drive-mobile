import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { GroupBoundary } from '../utils/photoTimelineGroups';
import {
  buildTimelineDateIndex,
  findAnchorForIndex,
  getIndexForOffset,
  getOffsetForIndex,
  getRailAnchorForScroll,
  getTimelineContentHeight,
} from '../utils/photoTimelineLayout';

const SCRUBBER_IDLE_HIDE_MS = 1500;
const SCRUBBER_RELEASE_SETTLE_PX = 2;
const SCRUBBER_RELEASE_TIMEOUT_MS = 400;
const SCRUBBER_FADE_MS = 200;
const SCRUBBER_MIN_SCROLLABLE_SCREENS = 2;

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

/** Month label shown while dragging, shaped for `useSyncExternalStore`. Null when not dragging. */
export interface ScrubberMonthLabelStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => string | null;
}

interface WritableMonthLabelStore extends ScrubberMonthLabelStore {
  set: (label: string | null) => void;
}

const createMonthLabelStore = (): WritableMonthLabelStore => {
  let label: string | null = null;
  const listeners = new Set<() => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => label,
    set: (next) => {
      if (next === label) {
        return;
      }
      label = next;
      listeners.forEach((listener) => listener());
    },
  };
};

interface PhotosScrubberConfig {
  scrollY: Animated.Value;
  boundaries: GroupBoundary[];
  itemCount: number;
  cellSize: number;
  contentTopInset: number;
  containerHeight: number;
  numColumns: number;
  listPaddingBottom: number;
  isEnabled: boolean;
  scrollToOffset: (offset: number) => void;
}

/** Handle position inputs, readable from both the gesture worklet and the animated style. */
export interface ScrubberDragValues {
  /** Rail length in pixels. The handle's centre is clamped to [0, railHeight]. */
  railHeight: SharedValue<number>;
  /** Maximum scroll offset, for mapping between the handle's position and the list's. */
  maxScroll: SharedValue<number>;
  /** Scroll position, mirrored from the RN Animated value FlashList drives. Positions the handle
   *  whenever a drag is not in progress. */
  scrollY: SharedValue<number>;
  /** Whether the handle is pinned to startCenterY rather than following the scroll. Stays true
   *  after the finger lifts until isReleasing resolves. */
  isDragging: SharedValue<boolean>;
  /** True between lifting the finger and the list reaching the offset the drag asked for. */
  isReleasing: SharedValue<boolean>;
  /** Where the handle's centre sits for the duration of a drag. */
  startCenterY: SharedValue<number>;
  /** Clamped finger displacement since the drag began. */
  translateY: SharedValue<number>;
}

export interface PhotosScrubberResult {
  isAvailable: boolean;
  opacity: Animated.Value;
  yearMarkersOpacity: Animated.Value;
  railTop: number;
  railHeight: number;
  drag: ScrubberDragValues;
  yearMarkers: ScrubberYearMarker[];
  monthLabelStore: ScrubberMonthLabelStore;
  onScrubStart: () => void;
  /** @param centerY the handle centre's position along the rail (0..railHeight), already clamped. */
  onScrubMove: (centerY: number) => void;
  onScrubEnd: () => void;
  notifyScroll: () => void;
}

const clampFraction = (value: number): number => Math.min(1, Math.max(0, value));

export const usePhotosScrubber = ({
  scrollY,
  boundaries,
  itemCount,
  cellSize,
  contentTopInset,
  containerHeight,
  numColumns,
  listPaddingBottom,
  isEnabled,
  scrollToOffset,
}: PhotosScrubberConfig): PhotosScrubberResult => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const isScrubbingRef = useRef(isScrubbing);
  isScrubbingRef.current = isScrubbing;

  const railHeight = Math.max(0, containerHeight - SCRUBBER_RAIL_TOP_INSET - SCRUBBER_RAIL_BOTTOM_INSET);

  const contentHeight = getTimelineContentHeight({
    itemCount,
    cellSize,
    contentTopInset,
    paddingBottom: listPaddingBottom,
    numColumns,
  });
  const maxScroll = Math.max(1, contentHeight - containerHeight);

  const isAvailable =
    isEnabled &&
    itemCount > 0 &&
    railHeight > 0 &&
    cellSize > 0 &&
    contentHeight > containerHeight * SCRUBBER_MIN_SCROLLABLE_SCREENS;

  const isAvailableRef = useRef(isAvailable);
  isAvailableRef.current = isAvailable;

  const scrubMetricsRef = useRef({ railHeight, maxScroll, cellSize, contentTopInset, numColumns });
  scrubMetricsRef.current = { railHeight, maxScroll, cellSize, contentTopInset, numColumns };

  const scrollToOffsetRef = useRef(scrollToOffset);
  scrollToOffsetRef.current = scrollToOffset;

  const dragTranslateY = useSharedValue(0);
  const dragStartCenterY = useSharedValue(0);
  const dragIsDragging = useSharedValue(false);
  const dragIsReleasing = useSharedValue(false);
  const railHeightShared = useSharedValue(0);
  const maxScrollShared = useSharedValue(0);
  const scrollYShared = useSharedValue(0);

  const drag = useMemo(
    () => ({
      railHeight: railHeightShared,
      maxScroll: maxScrollShared,
      scrollY: scrollYShared,
      isDragging: dragIsDragging,
      isReleasing: dragIsReleasing,
      startCenterY: dragStartCenterY,
      translateY: dragTranslateY,
    }),
    [
      railHeightShared,
      maxScrollShared,
      scrollYShared,
      dragIsDragging,
      dragIsReleasing,
      dragStartCenterY,
      dragTranslateY,
    ],
  );

  useEffect(() => {
    railHeightShared.value = railHeight;
    maxScrollShared.value = maxScroll;
  }, [railHeight, maxScroll, railHeightShared, maxScrollShared]);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      scrollYShared.value = value;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, scrollYShared]);

  const { yearAnchors, monthAnchors } = useMemo(() => buildTimelineDateIndex(boundaries), [boundaries]);

  const monthAnchorsRef = useRef(monthAnchors);
  monthAnchorsRef.current = monthAnchors;

  const yearMarkers = useMemo(() => {
    const markers: ScrubberYearMarker[] = [];
    let lastKeptY = Number.NEGATIVE_INFINITY;

    for (const anchor of yearAnchors) {
      const offset = getOffsetForIndex({ index: anchor.startIndex, cellSize, contentTopInset, numColumns });
      const y = clampFraction(offset / maxScroll) * railHeight;
      if (y - lastKeptY < SCRUBBER_YEAR_LABEL_MIN_GAP) {
        continue;
      }
      markers.push({ label: anchor.label, y });
      lastKeptY = y;
    }

    return markers;
  }, [yearAnchors, cellSize, contentTopInset, numColumns, maxScroll, railHeight]);

  const monthLabelStoreRef = useRef<WritableMonthLabelStore | null>(null);
  if (monthLabelStoreRef.current === null) {
    monthLabelStoreRef.current = createMonthLabelStore();
  }
  const monthLabelStore = monthLabelStoreRef.current;

  const updateMonthLabelForOffset = useCallback(
    (offset: number) => {
      const { cellSize: rowHeight, contentTopInset: topInset, numColumns: columns } = scrubMetricsRef.current;
      const index = getIndexForOffset({ offset, cellSize: rowHeight, contentTopInset: topInset, numColumns: columns });
      const anchor = findAnchorForIndex(monthAnchorsRef.current, index);
      monthLabelStore.set(anchor?.label ?? null);
    },
    [monthLabelStore],
  );

  const opacity = useRef(new Animated.Value(0)).current;
  const yearMarkersOpacity = useRef(new Animated.Value(0)).current;

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollAtRef = useRef(0);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const runHideTickRef = useRef<() => void>(null!);
  runHideTickRef.current = () => {
    hideTimeoutRef.current = null;
    if (isScrubbingRef.current) {
      return;
    }
    const idleFor = Date.now() - lastScrollAtRef.current;
    if (idleFor < SCRUBBER_IDLE_HIDE_MS) {
      hideTimeoutRef.current = setTimeout(() => runHideTickRef.current(), SCRUBBER_IDLE_HIDE_MS - idleFor);
      return;
    }
    setIsVisible(false);
  };

  // The pending timer re-arms itself with the idle time left, so skipping here loses nothing.
  const armHideTimer = useCallback((delay: number) => {
    if (hideTimeoutRef.current !== null) {
      return;
    }
    hideTimeoutRef.current = setTimeout(() => runHideTickRef.current(), delay);
  }, []);

  const notifyScroll = useCallback(() => {
    if (!isAvailableRef.current || isScrubbingRef.current) {
      return;
    }
    lastScrollAtRef.current = Date.now();
    setIsVisible(true);
    armHideTimer(SCRUBBER_IDLE_HIDE_MS);
  }, [armHideTimer]);

  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimeout = useCallback(() => {
    if (releaseTimeoutRef.current !== null) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
  }, []);

  // Hands the handle back to the scroll only once the scroll agrees with where it is being held.
  useAnimatedReaction(
    () =>
      getRailAnchorForScroll({
        scrollY: scrollYShared.value,
        maxScroll: maxScrollShared.value,
        railHeight: railHeightShared.value,
      }),
    (scrollAnchor) => {
      if (!dragIsReleasing.value) {
        return;
      }
      if (Math.abs(scrollAnchor - dragStartCenterY.value) <= SCRUBBER_RELEASE_SETTLE_PX) {
        dragIsReleasing.value = false;
        dragIsDragging.value = false;
      }
    },
  );

  const onScrubStart = useCallback(() => {
    // A release still settling from the previous drag would unpin this one mid-drag.
    clearReleaseTimeout();
    clearHideTimeout();
    setIsVisible(true);
    setIsScrubbing(true);
  }, [clearHideTimeout, clearReleaseTimeout]);

  const onScrubMove = useCallback(
    (centerY: number) => {
      const { railHeight: currentRailHeight, maxScroll: currentMaxScroll } = scrubMetricsRef.current;
      if (currentRailHeight <= 0) {
        return;
      }
      const offset = clampFraction(centerY / currentRailHeight) * currentMaxScroll;
      scrollToOffsetRef.current(offset);
      updateMonthLabelForOffset(offset);
    },
    [updateMonthLabelForOffset],
  );

  const onScrubEnd = useCallback(() => {
    // The anchor stays pinned past the end of the drag until the list catches up; the reaction
    // above unpins it on arrival, the timeout below unpins it if it never arrives.
    dragIsReleasing.value = true;
    clearReleaseTimeout();
    releaseTimeoutRef.current = setTimeout(() => {
      releaseTimeoutRef.current = null;
      // A new drag clears isReleasing from its worklet, which lands before onScrubStart gets to
      // cancel this timer.
      if (!dragIsReleasing.value) {
        return;
      }
      dragIsReleasing.value = false;
      dragIsDragging.value = false;
    }, SCRUBBER_RELEASE_TIMEOUT_MS);

    setIsScrubbing(false);
    monthLabelStore.set(null);
    lastScrollAtRef.current = Date.now();
    armHideTimer(SCRUBBER_IDLE_HIDE_MS);
  }, [armHideTimer, monthLabelStore, dragIsDragging, dragIsReleasing, clearReleaseTimeout]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isVisible && isAvailable ? 1 : 0,
      duration: SCRUBBER_FADE_MS,
      useNativeDriver: false,
    }).start();
  }, [isVisible, isAvailable, opacity]);

  useEffect(() => {
    Animated.timing(yearMarkersOpacity, {
      toValue: isScrubbing ? 1 : 0,
      duration: SCRUBBER_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [isScrubbing, yearMarkersOpacity]);

  useEffect(() => {
    if (isAvailable) {
      return;
    }
    clearHideTimeout();
    clearReleaseTimeout();
    dragIsDragging.value = false;
    dragIsReleasing.value = false;
    dragTranslateY.value = 0;
    monthLabelStore.set(null);
    setIsScrubbing(false);
    setIsVisible(false);
  }, [
    isAvailable,
    clearHideTimeout,
    clearReleaseTimeout,
    dragIsDragging,
    dragIsReleasing,
    dragTranslateY,
    monthLabelStore,
  ]);

  useEffect(() => clearHideTimeout, [clearHideTimeout]);
  useEffect(() => clearReleaseTimeout, [clearReleaseTimeout]);

  return {
    isAvailable,
    opacity,
    yearMarkersOpacity,
    railTop: SCRUBBER_RAIL_TOP_INSET,
    railHeight,
    drag,
    yearMarkers,
    monthLabelStore,
    onScrubStart,
    onScrubMove,
    onScrubEnd,
    notifyScroll,
  };
};
