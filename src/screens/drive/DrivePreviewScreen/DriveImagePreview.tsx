import { ImageViewer } from '@internxt-mobile/ui-kit';
import React from 'react';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTailwind } from 'tailwind-rn';

export interface DriveImagePreviewProps {
  imagePath: string;
  height: number;
  onTapImage: () => void;
  onZoomImage: () => void;
}

export const DriveImagePreview: React.FC<DriveImagePreviewProps> = (props) => {
  const tailwind = useTailwind();

  const handleOnTapImage = () => {
    props.onTapImage();
  };

  const handleOnZoomImage = () => {
    props.onZoomImage();
  };
  return (
    <Animated.View style={tailwind('flex-1')} entering={FadeInDown.delay(150).duration(250)}>
      <ImageViewer
        source={props.imagePath}
        onTapImage={handleOnTapImage}
        onZoomImage={handleOnZoomImage}
        onImageViewReset={() => {
          /** NOOP */
        }}
      />
    </Animated.View>
  );
};
