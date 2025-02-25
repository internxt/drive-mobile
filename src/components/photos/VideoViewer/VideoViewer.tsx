import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { Play } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useTailwind } from 'tailwind-rn';

interface VideoViewerProps {
  source?: string;
  thumbnail?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onVideoLoadError?: () => void;
}
export const VideoViewer: React.FC<VideoViewerProps> = ({ source, onPlay, onPause, thumbnail, onVideoLoadError }) => {
  const tailwind = useTailwind();
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState<any>();
  const videoPlayer = useRef<VideoRef>(null);
  useEffect(() => {
    if (playing) {
      onPlay && onPlay();
    } else {
      onPause && onPause();
    }
  }, [playing]);

  const play = () => {
    // Don't play the video if it has a loadError such incompatible codec or format
    if (loadError) {
      onPlay && onPlay();
      return;
    }
    if (Platform.OS === 'ios') {
      videoPlayer?.current?.presentFullscreenPlayer();
    }

    setPlaying(true);
  };

  const handleFullScreenModeDismiss = () => {
    videoPlayer.current?.seek(0);
  };

  const displayThumbnailOnPlay = Platform.OS === 'android' ? false : true;
  const displayPlayButtonOnPlay = Platform.OS === 'android' ? (playing ? false : true) : true;
  return (
    <View style={tailwind('h-full')}>
      <View style={[tailwind('flex-1 w-full h-full ')]}>
        {displayPlayButtonOnPlay ? (
          <View style={[tailwind('flex h-full w-full absolute justify-center items-center'), { zIndex: 1 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={play}
              style={[
                tailwind('h-20 rounded-full w-20 bg-black flex items-center justify-center'),
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
            >
              <Play size={40} weight="fill" color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
        {displayThumbnailOnPlay && thumbnail ? (
          <Image
            source={{
              uri: fileSystemService.pathToUri(thumbnail),
            }}
            style={tailwind('w-full h-full')}
            resizeMode={'contain'}
          />
        ) : null}
        {source ? (
          <Video
            ref={videoPlayer}
            ignoreSilentSwitch="ignore"
            paused={!playing}
            onError={(error) => {
              setLoadError(error);
              onVideoLoadError && onVideoLoadError();
            }}
            onFullscreenPlayerWillDismiss={handleFullScreenModeDismiss}
            onSeek={() => {
              if (Platform.OS === 'ios') {
                setPlaying(false);
              }
            }}
            style={
              Platform.OS === 'android'
                ? {
                    width: '100%',
                    height: '100%',
                  }
                : undefined
            }
            onEnd={() => {
              setPlaying(false);
              if (Platform.OS === 'ios') {
                videoPlayer.current?.dismissFullscreenPlayer();
              }
            }}
            repeat={false}
            controls={Platform.OS === 'android' && playing ? true : false}
            resizeMode="cover"
            source={{
              uri: source,
            }}
          />
        ) : null}
      </View>
    </View>
  );
};
