import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import {
  PhotosScrubberResult,
  SCRUBBER_HANDLE_HIT_MARGIN,
  SCRUBBER_HANDLE_SIZE,
  SCRUBBER_RAIL_WIDTH,
  SCRUBBER_YEAR_MARKER_HEIGHT,
  ScrubberMonthLabelStore,
} from '../../hooks/usePhotosScrubber';
import { getRailAnchorForScroll } from '../../utils/photoTimelineLayout';

interface PhotosScrubberProps {
  scrubber: PhotosScrubberResult;
}

const HANDLE_ROW_RIGHT_INSET = 4;
const PILL_HANDLE_GAP = 8;
const PILL_RIGHT_OFFSET = HANDLE_ROW_RIGHT_INSET + SCRUBBER_HANDLE_SIZE + PILL_HANDLE_GAP;

const ScrubberMonthPill = ({ store }: { store: ScrubberMonthLabelStore }): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const label = useSyncExternalStore(store.subscribe, store.getSnapshot);

  if (!label) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.floatingPill, tailwind('bg-gray-80')]}>
      <AppText medium style={[tailwind('text-sm'), { color: getColor('text-white') }]}>
        {label}
      </AppText>
    </View>
  );
};

const PhotosScrubber = ({ scrubber }: PhotosScrubberProps): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const { isAvailable, opacity, yearMarkersOpacity, railTop, railHeight, drag, yearMarkers, monthLabelStore } =
    scrubber;

  const scrubberRef = useRef(scrubber);
  scrubberRef.current = scrubber;

  const isDraggingHandleRef = useRef(false);

  const startScrub = useCallback(() => {
    isDraggingHandleRef.current = true;
    scrubberRef.current.onScrubStart();
  }, []);

  const moveScrub = useCallback((centerY: number) => {
    scrubberRef.current.onScrubMove(centerY);
  }, []);

  const endScrub = useCallback(() => {
    if (!isDraggingHandleRef.current) {
      return;
    }
    isDraggingHandleRef.current = false;
    scrubberRef.current.onScrubEnd();
  }, []);

  const handleStyle = useAnimatedStyle(() => {
    const anchor = drag.isDragging.value
      ? drag.startCenterY.value
      : getRailAnchorForScroll({
          scrollY: drag.scrollY.value,
          maxScroll: drag.maxScroll.value,
          railHeight: drag.railHeight.value,
        });

    return { transform: [{ translateY: anchor + drag.translateY.value - SCRUBBER_HANDLE_SIZE / 2 }] };
  });

  // Rewrites the finger delta as part of the anchor, leaving the handle at the same coordinate.
  const foldDragIntoAnchor = useCallback(() => {
    'worklet';
    drag.startCenterY.value = drag.startCenterY.value + drag.translateY.value;
    drag.translateY.value = 0;
  }, [drag]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isAvailable)
        .maxPointers(1)
        .hitSlop(SCRUBBER_HANDLE_HIT_MARGIN)
        // Not .onStart(), which only fires past Pan's activation threshold — holding the handle
        // without moving has to reveal the year markers.
        .onTouchesDown(() => {
          // Touch callbacks fire per pointer, so a second finger would otherwise re-pin the anchor
          // mid-drag.
          if (drag.isDragging.value) {
            return;
          }
          // Not in startScrub: that arrives a beat later, and a first onUpdate would then clamp
          // against the previous drag's anchor.
          drag.startCenterY.value = getRailAnchorForScroll({
            scrollY: drag.scrollY.value,
            maxScroll: drag.maxScroll.value,
            railHeight: drag.railHeight.value,
          });
          drag.translateY.value = 0;
          drag.isDragging.value = true;
          // Stops a previous release still settling from unpinning this drag.
          drag.isReleasing.value = false;
          scheduleOnRN(startScrub);
        })
        .onUpdate((event) => {
          // Clamped as an absolute centre, not as a delta, so the handle stops at the rail's ends
          // while the finger keeps going.
          const startCenterY = drag.startCenterY.value;
          const centerY = Math.min(drag.railHeight.value, Math.max(0, startCenterY + event.translationY));
          drag.translateY.value = centerY - startCenterY;
          scheduleOnRN(moveScrub, centerY);
        })
        // A tap without movement never activates Pan, so onFinalize alone would not fire.
        .onTouchesUp(() => {
          foldDragIntoAnchor();
          scheduleOnRN(endScrub);
        })
        // Backstop for cancellation paths. endScrub is idempotent, so both firing is fine.
        .onFinalize(() => {
          foldDragIntoAnchor();
          scheduleOnRN(endScrub);
        }),
    [isAvailable, drag, foldDragIntoAnchor, startScrub, moveScrub, endScrub],
  );

  if (!isAvailable) {
    return null;
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.container, { top: railTop, height: railHeight, opacity }]}>
      <Animated.View pointerEvents="none" style={{ opacity: yearMarkersOpacity }}>
        {yearMarkers.map((marker) => (
          <View
            key={marker.label}
            style={[styles.yearMarker, tailwind('bg-gray-80'), { top: marker.y - SCRUBBER_YEAR_MARKER_HEIGHT / 2 }]}
          >
            <AppText medium style={[tailwind('text-xs'), { color: getColor('text-white') }]}>
              {marker.label}
            </AppText>
          </View>
        ))}
      </Animated.View>

      <Reanimated.View pointerEvents="box-none" style={[styles.handleRow, handleStyle]}>
        <ScrubberMonthPill store={monthLabelStore} />

        <GestureDetector gesture={panGesture}>
          <View style={[styles.handle, tailwind('bg-primary')]}>
            <CaretUpIcon size={10} weight="bold" color={getColor('text-white')} />
            <CaretDownIcon size={10} weight="bold" color={getColor('text-white')} />
          </View>
        </GestureDetector>
      </Reanimated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    width: SCRUBBER_RAIL_WIDTH,
    zIndex: 5,
  },
  yearMarker: {
    position: 'absolute',
    right: PILL_RIGHT_OFFSET,
    height: SCRUBBER_YEAR_MARKER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  handleRow: {
    position: 'absolute',
    right: HANDLE_ROW_RIGHT_INSET,
    flexDirection: 'row',
    alignItems: 'center',
  },
  handle: {
    width: SCRUBBER_HANDLE_SIZE,
    height: SCRUBBER_HANDLE_SIZE,
    borderRadius: SCRUBBER_HANDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPill: {
    marginRight: PILL_HANDLE_GAP,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 96,
    alignItems: 'center',
  },
});

export default PhotosScrubber;
