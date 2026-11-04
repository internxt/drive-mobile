import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { DimensionValue, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import { applyOpacity } from '../../../helpers/colors';
import useGetColor from '../../../hooks/useColor';
import { SENDER_AVATAR_SIZE } from './SenderAvatar';

const SHIMMER_DURATION = 1500;
const ROW_ENTRY_DURATION = 500;
const ROW_ENTRY_STAGGER = 60;
const ROW_OPACITY_STEP = 0.1;
const LINE_HEIGHT = 11;
const SHORT_LINE_HEIGHT = 10;
const DATE_LINE_WIDTH = 36;
const LINE_RADIUS = 6;
const SUBJECT_WIDTH_RATIO = 0.7;
const HIGHLIGHT_OPACITY = 0.7;
const AVATAR_GAP = 12;
const LINE_GAP = 8;

const ROW_LINE_WIDTHS = [
  [62, 88, 74],
  [48, 70, 90],
  [70, 60, 82],
  [55, 84, 66],
  [66, 52, 78],
  [44, 76, 86],
  [58, 68, 72],
];

const toPercent = (value: number): DimensionValue => `${value}%`;

const SkeletonBlock = ({ shimmerProgress, style }: { shimmerProgress: SharedValue<number>; style: ViewStyle }) => {
  const getColor = useGetColor();
  const { width: windowWidth } = useWindowDimensions();
  const surfaceColor = getColor('bg-surface');

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-windowWidth, windowWidth]) }],
  }));

  return (
    <View style={[styles.block, { backgroundColor: getColor('bg-gray-5') }, style]}>
      <Animated.View style={[styles.shimmer, { width: windowWidth }, shimmerStyle]}>
        <LinearGradient
          colors={[
            applyOpacity(surfaceColor, 0),
            applyOpacity(surfaceColor, HIGHLIGHT_OPACITY),
            applyOpacity(surfaceColor, 0),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

export const MailListSkeleton = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.linear }), -1);
    return () => cancelAnimation(shimmerProgress);
  }, [shimmerProgress]);

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {ROW_LINE_WIDTHS.map(([senderWidth, subjectWidth, previewWidth], rowIndex) => (
        <Animated.View
          key={rowIndex}
          entering={FadeInDown.duration(ROW_ENTRY_DURATION).delay(rowIndex * ROW_ENTRY_STAGGER)}
        >
          <View
            style={[
              tailwind('flex-row px-4 py-3'),
              {
                opacity: 1 - rowIndex * ROW_OPACITY_STEP,
                borderBottomWidth: 1,
                borderBottomColor: getColor('border-gray-5'),
              },
            ]}
          >
            <SkeletonBlock
              shimmerProgress={shimmerProgress}
              style={{
                width: SENDER_AVATAR_SIZE,
                height: SENDER_AVATAR_SIZE,
                borderRadius: SENDER_AVATAR_SIZE / 2,
                marginRight: AVATAR_GAP,
              }}
            />
            <View style={tailwind('flex-1 pt-1')}>
              <View style={tailwind('flex-row justify-between')}>
                <SkeletonBlock
                  shimmerProgress={shimmerProgress}
                  style={{ width: toPercent(senderWidth), height: LINE_HEIGHT, borderRadius: LINE_RADIUS }}
                />
                <SkeletonBlock
                  shimmerProgress={shimmerProgress}
                  style={{ width: DATE_LINE_WIDTH, height: LINE_HEIGHT, borderRadius: LINE_RADIUS }}
                />
              </View>
              <SkeletonBlock
                shimmerProgress={shimmerProgress}
                style={{
                  width: toPercent(subjectWidth * SUBJECT_WIDTH_RATIO),
                  height: SHORT_LINE_HEIGHT,
                  borderRadius: LINE_RADIUS,
                  marginTop: LINE_GAP,
                }}
              />
              <SkeletonBlock
                shimmerProgress={shimmerProgress}
                style={{
                  width: toPercent(previewWidth),
                  height: SHORT_LINE_HEIGHT,
                  borderRadius: LINE_RADIUS,
                  marginTop: LINE_GAP,
                }}
              />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
