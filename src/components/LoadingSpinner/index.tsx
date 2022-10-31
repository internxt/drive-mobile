import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTailwind } from 'tailwind-rn';
import { Circle } from 'react-native-progress';
import SpinnerImage from '../../../assets/icons/spinner.svg';
import useGetColor from '../../hooks/useColor';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  useDefaultSpinner?: boolean;
  fill?: string;
  renderIcon?: (size?: number, color?: string) => JSX.Element;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 16,
  color,
  style,
  renderIcon,
  children,
  useDefaultSpinner,
  fill,
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const defaultColor = getColor('text-blue-60');
  const syncingSpinnerRotationAnimation = useRef(new Animated.Value(0)).current;
  const syncingSpinnerRotationInterpolation = syncingSpinnerRotationAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const runSyncingSpinnerAnimation = () => {
    if (useDefaultSpinner) return;
    return Animated.loop(
      Animated.timing(syncingSpinnerRotationAnimation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  };

  useEffect(() => {
    runSyncingSpinnerAnimation();
  }, []);

  return (
    <View style={[tailwind('flex-1 justify-center items-center')]}>
      <Animated.View
        style={[
          {
            transform: [{ rotate: syncingSpinnerRotationInterpolation }],
          },
          style,
        ]}
      >
        {renderIcon ? (
          renderIcon(size, color || defaultColor)
        ) : useDefaultSpinner ? (
          <DefaultSpinner width={size} height={size} color={color || defaultColor} fill={fill} />
        ) : (
          <SpinnerImage width={size} height={size} color={color || defaultColor} />
        )}
      </Animated.View>
      <View style={tailwind('absolute')}>{children}</View>
    </View>
  );
};

const DefaultSpinner: React.FC<{ width: number; height: number; color: string; fill?: string }> = ({
  width,
  color,
  fill,
}) => {
  return (
    <Circle
      size={width}
      borderColor={color}
      animated
      indeterminate
      borderWidth={2}
      style={{ backgroundColor: fill, borderRadius: 999 }}
    />
  );
};

export default LoadingSpinner;
