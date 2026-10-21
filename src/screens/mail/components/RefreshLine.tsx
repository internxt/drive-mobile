import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import { applyOpacity } from '../../../helpers/colors';
import useGetColor from '../../../hooks/useColor';

const LINE_HEIGHT = 2;
const HORIZONTAL_INSET = 16;
const SWEEP_DURATION = 1300;
const SWEEP_WIDTH_RATIO = 0.4;
const FADE_DURATION = 150;
const SWEEP_EASING = Easing.bezier(0.5, 0.1, 0.4, 0.9);

export const RefreshLine = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [lineWidth, setLineWidth] = useState(0);
  const sweepProgress = useSharedValue(0);
  const primaryColor = getColor('text-primary');
  const sweepWidth = lineWidth * SWEEP_WIDTH_RATIO;

  useEffect(() => {
    sweepProgress.value = withRepeat(withTiming(1, { duration: SWEEP_DURATION, easing: SWEEP_EASING }), -1);
    return () => cancelAnimation(sweepProgress);
  }, [sweepProgress]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweepProgress.value, [0, 1], [-sweepWidth, lineWidth]) }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(FADE_DURATION)}
      exiting={FadeOut.duration(FADE_DURATION)}
      accessibilityRole="progressbar"
      onLayout={(event) => setLineWidth(event.nativeEvent.layout.width)}
      style={[
        tailwind('absolute top-0 rounded-full overflow-hidden'),
        {
          left: HORIZONTAL_INSET,
          right: HORIZONTAL_INSET,
          height: LINE_HEIGHT,
          zIndex: 1,
          backgroundColor: getColor('bg-primary-10'),
        },
      ]}
    >
      <Animated.View style={[styles.sweep, { width: sweepWidth }, sweepStyle]}>
        <LinearGradient
          colors={[applyOpacity(primaryColor, 0), primaryColor, applyOpacity(primaryColor, 0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
