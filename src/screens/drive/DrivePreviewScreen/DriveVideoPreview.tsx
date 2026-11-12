import { fs } from '@internxt-mobile/services/FileSystemService';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VideoViewer } from 'src/components/photos/VideoViewer';

export interface DriveVideoPreviewProps {
  source: string;
  thumbnail?: string;
}

export const DriveVideoPreview: React.FC<DriveVideoPreviewProps> = (props) => {
  const [videoHasLoadError, setVideoHasLoadError] = useState(false);

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
    <Animated.View entering={FadeInDown.delay(150).duration(250)} style={styles.fill}>
      <View className="flex-1">
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

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
