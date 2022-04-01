import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

import SpinnerImage from '../../../assets/icons/spinner.svg';
import { getColor, tailwind } from '../../helpers/designSystem';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  renderIcon?: (size?: number, color?: string) => JSX.Element;
}

const LoadingSpinner = ({
  size = 16,
  color = getColor('blue-60'),
  style,
  renderIcon,
}: LoadingSpinnerProps): JSX.Element => {
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
      {renderIcon ? renderIcon(size, color) : <SpinnerImage width={size} height={size} color={color} />}
    </Animated.View>
  );
};

export default LoadingSpinner;
