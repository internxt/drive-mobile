import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { Bar as ProgressBar } from 'react-native-progress';
interface AppProgressBarProps {
  currentValue: number;
  totalValue: number;
  style?: StyleProp<ViewStyle>;
  progressStyle?: StyleProp<ViewStyle>;
  animateWidth?: boolean;
  height?: number;
  borderRadius?: number;
}

export default function AppProgressBar(props: AppProgressBarProps): JSX.Element {
  const tailwind = useTailwind();

  return (
    <View style={[tailwind('bg-gray-5 rounded'), props.style]}>
      <ProgressBar
        borderRadius={props.borderRadius || 10}
        width={null}
        animated
        height={props.height || 3}
        borderWidth={0}
        color={tailwind('text-primary').color as string}
        progress={(props.currentValue * 100) / props.totalValue / 100}
      />
    </View>
  );
}
