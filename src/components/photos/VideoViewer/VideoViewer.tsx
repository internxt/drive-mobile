import fileSystemService from '@internxt-mobile/services/FileSystemService';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { PlayIcon } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useTailwind } from 'tailwind-rn';

interface VideoViewerProps {
  source?: string;
  thumbnail?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onVideoLoadError?: () => void;
}

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

const lockToPortrait = async () => {
  if (isAndroid) {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    await NavigationBar.setVisibilityAsync('visible');
  }
};

const unlockOrientation = async () => {
  if (isAndroid) {
    await ScreenOrientation.unlockAsync();
    await NavigationBar.setVisibilityAsync('hidden');
    await NavigationBar.setBehaviorAsync('overlay-swipe');
  }
};

export const VideoViewer: React.FC<VideoViewerProps> = ({
  source,
  onPlay,
  onPause,
  onEnd,
  thumbnail,
  onVideoLoadError,
}) => {
  const tailwind = useTailwind();
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const videoPlayer = useRef<VideoRef>(null);

  useEffect(() => {
    setLoadError(undefined);
    setPlaying(false);
    setHasStarted(false);
  }, [source]);

  useEffect(() => {
    return () => {
      lockToPortrait();
    };
  }, []);

  const handlePlay = async () => {
    if (loadError) {
      onPlay?.();
      return;
    }

    if (isIOS) {
      videoPlayer.current?.presentFullscreenPlayer();
    }
    if (isAndroid) {
      await NavigationBar.setVisibilityAsync('hidden');
      await NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    setHasStarted(true);
    setPlaying(true);
    onPlay?.();
  };

  const handleFullscreenPresent = () => {
    unlockOrientation();
  };

  const handleFullscreenWillDismiss = () => {
    if (isIOS) {
      onEnd?.();
      setPlaying(false);
      setHasStarted(false);
      lockToPortrait();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  };

  const handleFullscreenDidDismiss = () => {
    if (isIOS) {
      videoPlayer.current?.seek(0);
    }
  };

  const handleError = (error: unknown) => {
    setLoadError(error);
    onVideoLoadError?.();
  };

  const handleEnd = () => {
    onEnd?.();
    setPlaying(false);
    setHasStarted(false);
    videoPlayer.current?.seek(0);
    videoPlayer.current?.dismissFullscreenPlayer();
    lockToPortrait();
  };

  // On iOS the native fullscreen player covers everything, so the thumbnail can stay.
  // On Android hide the thumbnail once started so the paused frame stays visible.
  const showThumbnail = isIOS || !hasStarted;

  return (
    <View style={tailwind('h-full')}>
      <View style={[tailwind('flex-1 w-full h-full')]}>
        {!playing && (
          <View style={[tailwind('flex h-full w-full absolute justify-center items-center'), { zIndex: 1 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePlay}
              style={[
                tailwind('h-20 rounded-full w-20 bg-black flex items-center justify-center'),
                { backgroundColor: 'rgba(0,0,0,0.5)' },
              ]}
            >
              <PlayIcon size={40} weight="fill" color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {showThumbnail && thumbnail && (
          <Image
            source={{ uri: fileSystemService.pathToUri(thumbnail) }}
            style={tailwind('w-full h-full')}
            resizeMode="contain"
          />
        )}
        {source && (
          <Video
            ref={videoPlayer}
            source={{ uri: source }}
            paused={!playing}
            resizeMode="contain"
            repeat={false}
            ignoreSilentSwitch="ignore"
            controls={isAndroid && hasStarted}
            style={isAndroid ? { width: '100%', height: '100%' } : undefined}
            onError={handleError}
            onEnd={handleEnd}
            onPlaybackStateChanged={(e) => {
              if (isAndroid && hasStarted && !e.isSeeking) {
                setPlaying(e.isPlaying);
                if (e.isPlaying) {
                  onPlay?.();
                } else {
                  onPause?.();
                }
              }
            }}
            onFullscreenPlayerWillPresent={handleFullscreenPresent}
            onFullscreenPlayerWillDismiss={handleFullscreenWillDismiss}
            onFullscreenPlayerDidDismiss={handleFullscreenDidDismiss}
          />
        )}
      </View>
    </View>
  );
};
