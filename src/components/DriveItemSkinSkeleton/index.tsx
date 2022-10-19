import { DriveListViewMode } from '@internxt-mobile/types/drive';
import React, { useState } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const DriveItemSkinSkeleton: React.FC<{ viewMode?: DriveListViewMode }> = ({ viewMode }) => {
  const tailwind = useTailwind();
  const [fadeAnim] = useState(new Animated.Value(1));

  Animated.loop(
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.4,
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

  if (viewMode === DriveListViewMode.Grid) {
    const renderGridItem = () => {
      return (
        <View style={[{ flex: 1 / 3 }, tailwind('items-center flex-col justify-center pt-6 mb-6')]}>
          <View style={tailwind('w-20 h-20 rounded bg-gray-5 mb-4')}></View>
          <View style={tailwind('w-full px-5 mb-1.5')}>
            <View style={tailwind('w-full h-3.5 rounded bg-gray-5')}></View>
          </View>
          <View style={tailwind('w-full px-8 mb-1.5')}>
            <View style={tailwind('w-full h-3 rounded bg-gray-5')}></View>
          </View>
          <View style={tailwind('w-full px-10 mb-1')}>
            <View style={tailwind('w-full h-3 rounded bg-gray-5')}></View>
          </View>
        </View>
      );
    };
    return (
      <Animated.View style={[tailwind('flex-row'), { opacity: fadeAnim }]}>
        {renderGridItem()}
        {renderGridItem()}
        {renderGridItem()}
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[tailwind('flex-row my-3 mx-5'), { opacity: fadeAnim }]}>
      <View style={tailwind('bg-gray-5 h-10 w-10 mr-4 rounded')} />

      <View style={tailwind('flex-col flex-grow justify-center')}>
        <View style={tailwind('h-3 w-2/6 mb-2 bg-gray-5 rounded')} />

        <View style={tailwind('h-2.5 w-3/4 bg-gray-5 rounded')} />
      </View>
    </Animated.View>
  );
};

export default DriveItemSkinSkeleton;
