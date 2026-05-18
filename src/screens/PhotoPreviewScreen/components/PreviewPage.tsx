import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';
import { VideoViewer } from '../../../components/photos/VideoViewer/VideoViewer';
import { ImageViewer } from '../../../components/ui-kit/view/ImageViewer/ImageViewer';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { usePreviewSource } from '../hooks/usePreviewSource';

interface PageContentProps {
  item: TimelinePhotoItem;
  uri: string | null | undefined;
  thumbnailUri: string | null;
  onTap: () => void;
  onZoom: () => void;
  onReset: () => void;
  onVideoPlay: () => void;
  onVideoPause: () => void;
}

const PageContent = ({
  item,
  uri,
  thumbnailUri,
  onTap,
  onZoom,
  onReset,
  onVideoPlay,
  onVideoPause,
}: PageContentProps): JSX.Element => {
  const tailwind = useTailwind();
  if (item.mediaType === 'video') {
    if (uri) {
      return (
        <VideoViewer source={uri} thumbnail={thumbnailUri ?? undefined} onPlay={onVideoPlay} onPause={onVideoPause} />
      );
    }
    return (
      <View style={tailwind('flex-1 bg-black justify-center items-center')}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={tailwind('w-full h-full')} resizeMode="contain" />
        ) : null}
        {uri === undefined ? <ActivityIndicator style={tailwind('absolute')} color="white" size="large" /> : null}
      </View>
    );
  }

  if (uri) {
    return <ImageViewer source={uri} onTapImage={onTap} onZoomImage={onZoom} onImageViewReset={onReset} />;
  }

  return (
    <View style={tailwind('flex-1 justify-center items-center')}>
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={tailwind('w-full h-full')} resizeMode="contain" />
      ) : null}
      {uri === undefined ? <ActivityIndicator style={tailwind('absolute')} color="white" size="large" /> : null}
    </View>
  );
};

interface PreviewPageProps {
  item: TimelinePhotoItem;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onSwipeDown: () => void;
}

export const PreviewPage = ({ item, onTap, onZoomChange, onSwipeDown }: PreviewPageProps): JSX.Element => {
  const tailwind = useTailwind();
  const { width: screenWidth } = useWindowDimensions();
  const { uri, thumbnailUri } = usePreviewSource(item);
  const [zoomed, setZoomed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const translateY = useSharedValue(0);

  const handleZoom = useCallback(() => {
    setZoomed(true);
    onZoomChange(true);
  }, [onZoomChange]);

  const handleReset = useCallback(() => {
    setZoomed(false);
    onZoomChange(false);
  }, [onZoomChange]);

  const playVideo = useCallback(() => {
    setVideoPlaying(true);
  }, []);

  const pauseVideo = useCallback(() => {
    setVideoPlaying(false);
  }, []);

  const swipeDownGesture = Gesture.Pan()
    .enabled(!zoomed && !videoPlaying)
    .activeOffsetY(10)
    .failOffsetX([-15, 15])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100) {
        runOnJS(onSwipeDown)();
      } else {
        translateY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={swipeDownGesture}>
      <Animated.View style={[tailwind('flex-1 bg-black'), { width: screenWidth }, animatedStyle]}>
        <PageContent
          item={item}
          uri={uri}
          thumbnailUri={thumbnailUri}
          onTap={onTap}
          onZoom={handleZoom}
          onReset={handleReset}
          onVideoPlay={playVideo}
          onVideoPause={pauseVideo}
        />
      </Animated.View>
    </GestureDetector>
  );
};
