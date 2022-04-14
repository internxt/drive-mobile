import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

interface AppProgressBarProps {
  currentValue: number;
  totalValue: number;
  style?: StyleProp<ViewStyle>;
  progressStyle?: StyleProp<ViewStyle>;
  animateWidth?: boolean;
}

export default function AppProgressBar(props: AppProgressBarProps): JSX.Element {
  const { totalValue, progressStyle } = props;
  const currentValue = props.currentValue >= totalValue ? totalValue : props.currentValue;
  const rightRounded = currentValue >= totalValue;
  const [width] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(width, {
      toValue: props.currentValue,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  }, [props.currentValue]);

  return (
    <View style={[tailwind('rounded h-2 bg-neutral-30'), props.style]}>
      <Animated.View
        style={[
          tailwind('rounded-tl rounded-bl bg-blue-60 h-full'),
          progressStyle,
          rightRounded && tailwind('rounded-tr rounded-br'),
          {
            width: props.animateWidth
              ? width.interpolate({
                  inputRange: [0, props.totalValue || 1],
                  outputRange: ['0%', '100%'],
                })
              : (props.currentValue / totalValue) * 100 + '%',
          },
        ]}
      />
    </View>
  );
}
