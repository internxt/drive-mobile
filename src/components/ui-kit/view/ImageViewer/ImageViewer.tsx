import { useState } from 'react';
import { Dimensions, Image, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTailwind } from 'tailwind-rn/dist';
interface ImageViewerProps {
  source: string;
  onTapImage: () => void;
  onZoomImage: () => void;
  onImageViewReset: () => void;
}

const SCALE_LIMIT = 25;
const DEFAULT_EASING = Easing.bezier(0, 0, 0.58, 1);

export const ImageViewer: React.FC<ImageViewerProps> = ({ source, onTapImage, onZoomImage, onImageViewReset }) => {
  const tailwind = useTailwind();
  const [panEnabled, setPanEnabled] = useState(false);
  const imageRef = useAnimatedRef<Animated.Image>();
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Context values for gestures
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const animatedStyles = useAnimatedStyle(() => {
    const rotationFinal = interpolate(rotate.value, [0, 1], [0, 45]);
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotationFinal}deg` },
      ],
    };
  });

  const getImageRenderedDimensions = async (): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      Image.getSize(source, (width, height) => {
        const windowWidth = Dimensions.get('window').width;

        // Calculate rendered image size
        resolve({
          width: windowWidth,
          height: (windowWidth * height) / width,
        });
      });
    });
  };

  const fitImageToBorders = () => {
    isImageOutOfBounds().then(({ outOf, limits }) => {
      if (outOf.top) {
        translateY.value = withTiming(limits.top, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      }
      if (outOf.bottom) {
        translateY.value = withTiming(limits.bottom, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      }
      if (outOf.left) {
        translateX.value = withTiming(limits.left, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      }
      if (outOf.right) {
        translateX.value = withTiming(limits.right, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      }
    });
  };

  // Pinch gesture (zoom)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      scheduleOnRN(onZoomImage);
    })
    .onUpdate((event) => {
      const newScale = event.scale * savedScale.value;
      if (newScale <= SCALE_LIMIT && newScale > 1) {
        scale.value = newScale;
      }
    })
    .onEnd(() => {
      const currentScale = parseFloat(scale.value.toFixed(2));
      if (currentScale <= 1) {
        scale.value = withTiming(1, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
        rotate.value = 0;
        translateX.value = 0;
        translateY.value = 0;
        scheduleOnRN(onImageViewReset);
        scheduleOnRN(setPanEnabled, false);
      }

      if (currentScale > 1) {
        scheduleOnRN(setPanEnabled, true);
      }
    });

  // Pan gesture (move around)
  const panGesture = Gesture.Pan()
    .enabled(panEnabled)
    .minDistance(5)
    .minPointers(1)
    .maxPointers(1)
    .averageTouches(true)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const normalizedX = event.translationX / scale.value;
      const normalizedY = event.translationY / scale.value;
      translateX.value = withTiming(normalizedX + savedTranslateX.value, {
        duration: 50,
        easing: DEFAULT_EASING,
      });
      translateY.value = withTiming(normalizedY + savedTranslateY.value, {
        duration: 50,
        easing: DEFAULT_EASING,
      });
    })
    .onEnd(() => {
      scheduleOnRN(fitImageToBorders);
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotate.value;
    })
    .onUpdate((event) => {
      rotate.value = event.rotation + savedRotation.value;
    })
    .onEnd(() => {
      rotate.value = withTiming(0, {
        duration: 150,
        easing: DEFAULT_EASING,
      });
    });

  // Single tap gesture
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      scheduleOnRN(onTapImage);
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value === 1) {
        scheduleOnRN(setPanEnabled, true);
        scale.value = withTiming(scale.value * 2, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      } else {
        scheduleOnRN(setPanEnabled, false);
        scale.value = withTiming(1, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
        translateX.value = withTiming(0, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
        translateY.value = withTiming(0, {
          duration: 150,
          easing: DEFAULT_EASING,
        });
      }
    });

  const isImageOutOfBounds = async (): Promise<{
    outOf: { left: boolean; right: boolean; top: boolean; bottom: boolean };
    limits: { left: number; right: number; top: number; bottom: number };
  }> => {
    const imageBoundingBox = await getImageRenderedDimensions();

    const currentImageHeight = imageBoundingBox.height * scale.value;
    const currentImageWidth = imageBoundingBox.width * scale.value;
    const maxX = (currentImageWidth - imageBoundingBox.width) / 2;
    const maxY = (currentImageHeight - imageBoundingBox.height) / 2;
    const displacementX = translateX.value * scale.value;
    const displacementY = translateY.value * scale.value;
    const outOf = {
      left: Math.abs(displacementX) > maxX && displacementX > 0,
      right: Math.abs(displacementX) > maxX && displacementX < 0,
      top: Math.abs(displacementY) > maxY && displacementY > 0,
      bottom: Math.abs(displacementY) > maxY && displacementY < 0,
    };

    const limits = {
      left: maxX / scale.value,
      right: -(maxX / scale.value),
      top: maxY / scale.value,
      bottom: -(maxY / scale.value),
    };

    return {
      outOf,
      limits,
    };
  };

  // Combine gestures: tap gestures are exclusive, others are simultaneous
  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const simultaneousGestures = Gesture.Simultaneous(pinchGesture, panGesture, rotationGesture);
  const composedGesture = Gesture.Race(tapGestures, simultaneousGestures);

  return (
    <View style={tailwind('flex-1 overflow-hidden')}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={tailwind('flex-1')}>
          <Animated.Image
            ref={imageRef}
            source={{ uri: source }}
            style={[
              {
                width: '100%',
                height: '100%',
              },
              animatedStyles,
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
