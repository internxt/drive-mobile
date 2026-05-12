import { useCallback, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';
import { ImageViewer } from '../../../components/ui-kit/view/ImageViewer/ImageViewer';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { usePreviewSource } from '../hooks/usePreviewSource';
import { VideoPlaceholder } from './VideoPlaceholder';

interface PageContentProps {
  item: TimelinePhotoItem;
  uri: string | null | undefined;
  onTap: () => void;
  onZoom: () => void;
  onReset: () => void;
}

const PageContent = ({ item, uri, onTap, onZoom, onReset }: PageContentProps): JSX.Element => {
  const tailwind = useTailwind();
  if (item.mediaType === 'video') {
    return <VideoPlaceholder item={item} />;
  }

  if (uri) {
    return <ImageViewer source={uri} onTapImage={onTap} onZoomImage={onZoom} onImageViewReset={onReset} />;
  }

  return (
    <View style={tailwind('flex-1 justify-center items-center')}>
      <ActivityIndicator color="white" size="large" />
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
  const { uri } = usePreviewSource(item);
  const [zoomed, setZoomed] = useState(false);
  const translateY = useSharedValue(0);

  const handleZoom = useCallback(() => {
    setZoomed(true);
    onZoomChange(true);
  }, [onZoomChange]);

  const handleReset = useCallback(() => {
    setZoomed(false);
    onZoomChange(false);
  }, [onZoomChange]);

  const swipeDownGesture = Gesture.Pan()
    .enabled(!zoomed)
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
        <PageContent item={item} uri={uri} onTap={onTap} onZoom={handleZoom} onReset={handleReset} />
      </Animated.View>
    </GestureDetector>
  );
};
