import { fs } from '@internxt-mobile/services/FileSystemService';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VideoViewer } from 'src/components/photos/VideoViewer';

import { useTailwind } from 'tailwind-rn';

export interface DriveVideoPreviewProps {
  source: string;
  thumbnail?: string;
}

export const DriveVideoPreview: React.FC<DriveVideoPreviewProps> = (props) => {
  const [videoHasLoadError, setVideoHasLoadError] = useState(false);
  const tailwind = useTailwind();

  useEffect(() => {
    setVideoHasLoadError(false);
  }, [props.source]);

  const handleOnVideoPlay = async () => {
    // Fallback to display native file viewer if the native video player load fails
    if (videoHasLoadError) {
      await fs.showFileViewer(props.source);
    }
  };
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(250)} style={tailwind('flex-1')}>
      <View style={tailwind('flex-1')}>
        <VideoViewer
          thumbnail={props.thumbnail}
          source={props.source}
          onPlay={handleOnVideoPlay}
          onVideoLoadError={() => {
            setVideoHasLoadError(true);
          }}
        />
      </View>
    </Animated.View>
  );
};
