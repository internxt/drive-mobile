import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { memo, useMemo } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  scrollTo,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import globalStyles from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import {
  hideAfterIdle,
  PhotosScrubberResult,
  SCRUBBER_HANDLE_HIT_MARGIN,
  SCRUBBER_HANDLE_SIZE,
  SCRUBBER_RAIL_WIDTH,
  SCRUBBER_YEAR_MARKER_HEIGHT,
  ScrubberDragValues,
} from '../../hooks/usePhotosScrubber';
import { findLastIndexAtOrBefore, getRailAnchorForScroll } from '../../utils/photoTimelineLayout';

interface PhotosScrubberProps {
  scrubber: PhotosScrubberResult;
}

const HANDLE_ROW_RIGHT_INSET = 4;
const HANDLE_ICON_SIZE = 10;
const SCRUBBER_SCROLL_INTERVAL_MS = 50;
const SCRUBBER_Z_INDEX = 5;
const YEAR_MARKER_HORIZONTAL_PADDING = 10;
const YEAR_MARKER_BORDER_RADIUS = 12;
const PILL_HORIZONTAL_PADDING = 14;
const PILL_VERTICAL_PADDING = 8;
const PILL_BORDER_RADIUS = 16;
const PILL_TEXT_WIDTH = 72;
const PILL_FONT_SIZE = 14;
const PILL_LINE_HEIGHT = 20;
const PILL_HANDLE_GAP = 8;
const PILL_RIGHT_OFFSET = HANDLE_ROW_RIGHT_INSET + SCRUBBER_HANDLE_SIZE + PILL_HANDLE_GAP;
const YEAR_MARKERS_FADE_MS = 200;

const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

// Memoized on `drag`, which never changes: a React render of the TextInput would clear the text
// Reanimated wrote to it.
const ScrubberMonthPill = memo(({ drag }: { drag: ScrubberDragValues }): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const monthPillStyle = useAnimatedStyle(() => ({
    opacity: drag.isTouching.value && drag.monthLabels.value[drag.monthIndex.value] !== undefined ? 1 : 0,
  }));

  // `text` is not a typed TextInput prop; Reanimated writes it to the native view.
  const monthLabelProps = useAnimatedProps(
    () => ({ text: drag.monthLabels.value[drag.monthIndex.value] ?? '' }) as Partial<TextInputProps>,
  );

  return (
    <Reanimated.View pointerEvents="none" style={[styles.monthPill, tailwind('bg-gray-80'), monthPillStyle]}>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        animatedProps={monthLabelProps}
        style={[styles.monthPillText, { color: getColor('text-white') }]}
      />
    </Reanimated.View>
  );
});

const PhotosScrubber = ({ scrubber }: PhotosScrubberProps): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const { isAvailable, listRef, railTop, railHeight, drag, yearMarkers, onScrubStart, onScrubEnd } = scrubber;

  const containerStyle = useAnimatedStyle(() => ({ opacity: drag.opacity.value }));
  const containerProps = useAnimatedProps(() => ({
    pointerEvents: drag.opacity.value > 0 ? ('box-none' as const) : ('none' as const),
  }));

  const handleStyle = useAnimatedStyle(() => {
    const centerY = drag.isDragging.value
      ? drag.startCenterY.value + drag.translateY.value
      : getRailAnchorForScroll({
          scrollY: drag.scrollOffset.value,
          maxScroll: drag.maxScroll.value,
          railHeight: drag.railHeight.value,
        }) + drag.idleCorrection.value;

    return { transform: [{ translateY: centerY - SCRUBBER_HANDLE_SIZE / 2 }] };
  });

  const yearMarkersStyle = useAnimatedStyle(() => ({
    opacity: withTiming(drag.isDragging.value && !drag.isReleasing.value ? 1 : 0, {
      duration: YEAR_MARKERS_FADE_MS,
    }),
  }));

  const panGesture = useMemo(() => {
    const getOffsetForCenter = (centerY: number) => {
      'worklet';
      const railLength = drag.railHeight.value;
      return railLength > 0 ? (centerY / railLength) * drag.maxScroll.value : 0;
    };

    const updateMonthForCenter = (centerY: number) => {
      'worklet';
      drag.monthIndex.value = findLastIndexAtOrBefore(drag.monthOffsets.value, getOffsetForCenter(centerY));
    };

    const finishDrag = () => {
      'worklet';
      const dragCount = drag.dragCount.value;
      if (drag.endedDragCount.value === dragCount) {
        return;
      }
      drag.endedDragCount.value = dragCount;
      drag.isTouching.value = false;
      drag.startCenterY.value = drag.startCenterY.value + drag.translateY.value;
      drag.translateY.value = 0;
      scrollTo(listRef, 0, getOffsetForCenter(drag.startCenterY.value), false);
      drag.isReleasing.value = true;
      drag.opacity.value = hideAfterIdle();
      scheduleOnRN(onScrubEnd, dragCount);
    };

    return (
      Gesture.Pan()
        .enabled(isAvailable)
        .maxPointers(1)
        .hitSlop(SCRUBBER_HANDLE_HIT_MARGIN)
        // Not .onStart(), which only fires past Pan's activation threshold — holding the handle
        // without moving has to reveal the year markers.
        .onTouchesDown(() => {
          // Touch callbacks fire per pointer, so a second finger would otherwise re-pin the anchor
          // mid-drag.
          if (drag.isDragging.value && !drag.isReleasing.value) {
            return;
          }
          // A rescale still animating would keep moving the list under a still finger.
          cancelAnimation(drag.maxScroll);
          const currentCenterY = drag.isDragging.value
            ? drag.startCenterY.value + drag.translateY.value
            : getRailAnchorForScroll({
                scrollY: drag.scrollOffset.value,
                maxScroll: drag.maxScroll.value,
                railHeight: drag.railHeight.value,
              }) + drag.idleCorrection.value;
          const dragCount = drag.dragCount.value + 1;
          drag.dragCount.value = dragCount;
          drag.startCenterY.value = currentCenterY;
          drag.translateY.value = 0;
          drag.idleCorrection.value = 0;
          drag.lastScrollCommandTimeMs.value = 0;
          updateMonthForCenter(currentCenterY);
          drag.isDragging.value = true;
          drag.isReleasing.value = false;
          drag.isTouching.value = true;
          drag.opacity.value = 1;
          scheduleOnRN(onScrubStart, dragCount);
        })
        .onUpdate((event) => {
          // Clamped as an absolute centre, not as a delta, so the handle stops at the rail's ends
          // while the finger keeps going.
          const startCenterY = drag.startCenterY.value;
          const centerY = Math.min(drag.railHeight.value, Math.max(0, startCenterY + event.translationY));
          drag.translateY.value = centerY - startCenterY;
          updateMonthForCenter(centerY);

          const currentTimeMs = Date.now();
          if (currentTimeMs - drag.lastScrollCommandTimeMs.value < SCRUBBER_SCROLL_INTERVAL_MS) {
            return;
          }
          drag.lastScrollCommandTimeMs.value = currentTimeMs;
          scrollTo(listRef, 0, getOffsetForCenter(centerY), false);
        })
        // A tap without movement never activates Pan, so onFinalize alone would not fire.
        .onTouchesUp((event) => {
          if (event.numberOfTouches > 0) {
            return;
          }
          finishDrag();
        })
        // Backstop for cancellation paths; finishDrag runs once per drag.
        .onFinalize(() => {
          finishDrag();
        })
    );
  }, [isAvailable, drag, listRef, onScrubStart, onScrubEnd]);

  if (!isAvailable) {
    return null;
  }

  return (
    <Reanimated.View
      animatedProps={containerProps}
      style={[styles.container, { top: railTop, height: railHeight }, containerStyle]}
    >
      <Reanimated.View pointerEvents="none" style={yearMarkersStyle}>
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
      </Reanimated.View>

      <Reanimated.View pointerEvents="box-none" style={[styles.handleRow, handleStyle]}>
        <ScrubberMonthPill drag={drag} />

        <GestureDetector gesture={panGesture}>
          <View style={[styles.handle, tailwind('bg-primary')]}>
            <CaretUpIcon size={HANDLE_ICON_SIZE} weight="bold" color={getColor('text-white')} />
            <CaretDownIcon size={HANDLE_ICON_SIZE} weight="bold" color={getColor('text-white')} />
          </View>
        </GestureDetector>
      </Reanimated.View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    width: SCRUBBER_RAIL_WIDTH,
    zIndex: SCRUBBER_Z_INDEX,
  },
  yearMarker: {
    position: 'absolute',
    right: PILL_RIGHT_OFFSET,
    height: SCRUBBER_YEAR_MARKER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: YEAR_MARKER_HORIZONTAL_PADDING,
    borderRadius: YEAR_MARKER_BORDER_RADIUS,
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
  monthPill: {
    marginRight: PILL_HANDLE_GAP,
    paddingHorizontal: PILL_HORIZONTAL_PADDING,
    paddingVertical: PILL_VERTICAL_PADDING,
    borderRadius: PILL_BORDER_RADIUS,
  },
  monthPillText: {
    width: PILL_TEXT_WIDTH,
    padding: 0,
    ...globalStyles.fontWeight.medium,
    fontSize: PILL_FONT_SIZE,
    textAlign: 'center',
    // iOS draws a single-line TextInput with lineHeight at the bottom of the line box.
    ...Platform.select({ ios: { height: PILL_LINE_HEIGHT }, default: { lineHeight: PILL_LINE_HEIGHT } }),
  },
});

export default PhotosScrubber;
