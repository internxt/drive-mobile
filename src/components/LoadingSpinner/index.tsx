import { Spinner } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const LoadingSpinner = ({ size = 16, color = getColor('neutral-100'), style }: LoadingSpinnerProps): JSX.Element => {
  const [syncingSpinnerRotationAnimation] = useState(new Animated.Value(0));
  const syncingSpinnerRotationInterpolation = syncingSpinnerRotationAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const runSyncingSpinnerAnimation = () => {
    syncingSpinnerRotationAnimation.setValue(0);

    Animated.timing(syncingSpinnerRotationAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(() => runSyncingSpinnerAnimation());
  };

  useEffect(() => {
    runSyncingSpinnerAnimation();
  }, []);

  return (
    <Animated.View
      style={[
        tailwind('justify-center'),
        {
          transform: [
            {
              rotate: syncingSpinnerRotationInterpolation,
            },
          ],
        },
        style,
      ]}
    >
      <Spinner size={size} color={color} />
    </Animated.View>
  );
};

export default LoadingSpinner;
