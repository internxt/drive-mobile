import { ImageViewer } from '@internxt-mobile/ui-kit';
import React from 'react';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { StyleSheet } from 'react-native';

export interface DriveImagePreviewProps {
  imagePath: string;
  height: number;
  onTapImage: () => void;
  onZoomImage: () => void;
}

export const DriveImagePreview: React.FC<DriveImagePreviewProps> = (props) => {
  const handleOnTapImage = () => {
    props.onTapImage();
  };

  const handleOnZoomImage = () => {
    props.onZoomImage();
  };
  return (
    <Animated.View style={styles.fill} entering={FadeInDown.delay(150).duration(250)}>
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

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
