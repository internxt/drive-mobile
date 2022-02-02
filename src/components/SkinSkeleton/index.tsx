import React, { useState } from 'react';
import { View, Animated, Easing } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

export default function SkinSkeleton(): JSX.Element {
  const [fadeAnim] = useState(new Animated.Value(1));

  Animated.loop(
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]),
  ).start();

  return (
    <Animated.View style={[tailwind('flex-row my-3 mx-5'), { opacity: fadeAnim }]}>
      <View style={tailwind('bg-neutral-30 h-10 w-10 mr-4 rounded')} />

      <View style={tailwind('flex-col flex-grow justify-center')}>
        <View style={tailwind('h-3 w-2/6 mb-2 bg-neutral-30 rounded')} />

        <View style={tailwind('h-2.5 w-3/4 bg-neutral-10 rounded')} />
      </View>
    </Animated.View>
  );
}
