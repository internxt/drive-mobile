import React from 'react';
import { View, Animated, Easing } from 'react-native';
import { getColor, tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'

export default function SkinSkeleton(): JSX.Element {

  const fadeAnim = new Animated.Value(1); // Initial value for opacity: 0

  Animated.loop(
    Animated.sequence([
      Animated.timing(
        fadeAnim,
        {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true
        }
      ),
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true
        }
      )
    ])
  ).start();

  return <Animated.View style={[tailwind('flex-row m-3 mr-4'), { opacity: fadeAnim }]}>

    <View style={tailwind('bg-neutral-30 h-8 w-8 m-1')} />

    <View style={tailwind('flex-col flex-grow')}>
      <View style={tailwind('h-3 m-1 bg-neutral-30')} />

      <View style={tailwind('h-2 m-1 bg-neutral-30')} />
    </View>
    <View style={tailwind('items-center justify-center')}>
      <Unicons.UilEllipsisH color={getColor('neutral-30')} />
    </View>

  </Animated.View>;
}
