import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VideoViewer } from 'src/components/photos/VideoViewer';

import { useTailwind } from 'tailwind-rn';

export interface DriveVideoPreviewProps {
  source: string;
  thumbnail?: string;
}

export const DriveVideoPreview: React.FC<DriveVideoPreviewProps> = (props) => {
  const tailwind = useTailwind();

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(250)} style={tailwind('flex-1')}>
      <View style={tailwind('flex-1')}>
        <VideoViewer thumbnail={props.thumbnail} source={props.source} />
      </View>
    </Animated.View>
  );
};
