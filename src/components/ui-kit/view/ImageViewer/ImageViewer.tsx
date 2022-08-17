import { useRef, useState } from 'react';
import { View, Image, Dimensions } from 'react-native';
import {
  GestureEvent,
  PanGestureHandler,
  PanGestureHandlerEventPayload,
  PinchGestureHandler,
  PinchGestureHandlerEventPayload,
  RotationGestureHandler,
  RotationGestureHandlerEventPayload,
  TapGestureHandler,
  TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { useTailwind } from 'tailwind-rn/dist';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  interpolate,
  useAnimatedRef,
  runOnJS,
  withTiming,
  Easing,
} from 'react-native-reanimated';
interface ImageViewerProps {
  source: string;
  onTapImage: () => void;
  onZoomImage: () => void;
  onImageViewReset: () => void;
}

type PanGestureContext = {
  translationX: number;
  translationY: number;
};

type PinchGestureContext = {
  scale: number;
  focalX: number;
  focalY: number;
};

type RotationGestureContext = {
  rotation: number;
};

const SCALE_LIMIT = 25;
const DEFAULT_EASING = Easing.bezier(0, 0, 0.58, 1);
export const ImageViewer: React.FC<ImageViewerProps> = ({ source, onTapImage, onZoomImage, onImageViewReset }) => {
  const tailwind = useTailwind();
  const [panEnabled, setPanEnabled] = useState(false);
  const imageRef = useAnimatedRef<Animated.Image>();
  const doubleTapRef = useRef();
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

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

  const pinchRef = useRef();
  const panRef = useRef();
  const rotationRef = useRef();

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
  // Zoom event
  const onPinchEvent = useAnimatedGestureHandler<GestureEvent<PinchGestureHandlerEventPayload>, PinchGestureContext>(
    {
      onStart(event, context) {
        context.scale = scale.value;
        runOnJS(onZoomImage)();
      },
      onActive(event, context) {
        const newScale = event.scale * context.scale;
        if (newScale <= SCALE_LIMIT && newScale > 1) {
          scale.value = newScale;
        }
      },
      onEnd() {
        const currentScale = parseFloat(scale.value.toFixed(2));
        if (currentScale <= 1) {
          scale.value = withTiming(1, {
            duration: 150,
            easing: DEFAULT_EASING,
          });
          rotate.value = 0;
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(onImageViewReset)();
          runOnJS(setPanEnabled)(false);
        }

        if (currentScale > 1) {
          runOnJS(setPanEnabled)(true);
        }
      },
    },
    [panEnabled],
  );

  // Move around event
  const onPanEvent = useAnimatedGestureHandler<GestureEvent<PanGestureHandlerEventPayload>, PanGestureContext>({
    onStart(_, context) {
      context.translationX = translateX.value;
      context.translationY = translateY.value;
    },
    onActive(event, context) {
      const normalizedX = event.translationX / scale.value;
      const normalizedY = event.translationY / scale.value;
      translateX.value = withTiming(normalizedX + context.translationX, {
        duration: 50,
        easing: DEFAULT_EASING,
      });
      translateY.value = withTiming(normalizedY + context.translationY, {
        duration: 50,
        easing: DEFAULT_EASING,
      });
    },
    onEnd: () => {
      runOnJS(fitImageToBorders)();
    },
  });

  // Rotation event
  const onRotationEvent = useAnimatedGestureHandler<
    GestureEvent<RotationGestureHandlerEventPayload>,
    RotationGestureContext
  >({
    onStart(_, context) {
      context.rotation = rotate.value;
    },
    onActive(event, context) {
      rotate.value = event.rotation + context.rotation;
    },
    onEnd() {
      rotate.value = withTiming(0, {
        duration: 150,
        easing: DEFAULT_EASING,
      });
    },
  });

  const onTapEvent = useAnimatedGestureHandler<GestureEvent<TapGestureHandlerEventPayload>>(
    {
      onEnd: () => {
        runOnJS(onTapImage)();
      },
    },
    [onTapImage],
  );
  const onDoubleTapEvent = useAnimatedGestureHandler<GestureEvent<TapGestureHandlerEventPayload>>(
    {
      onActive() {
        if (scale.value === 1) {
          runOnJS(setPanEnabled)(true);
          scale.value = withTiming(scale.value * 2, {
            duration: 150,
            easing: DEFAULT_EASING,
          });
        } else {
          runOnJS(setPanEnabled)(false);
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
      },
    },
    [onTapImage],
  );
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

  return (
    <View style={tailwind('flex-1 overflow-hidden')}>
      <TapGestureHandler onGestureEvent={onTapEvent} waitFor={doubleTapRef}>
        <Animated.View style={tailwind('flex-1')}>
          <TapGestureHandler ref={doubleTapRef} onGestureEvent={onDoubleTapEvent} numberOfTaps={2}>
            <Animated.View style={tailwind('flex-1')}>
              <PanGestureHandler
                minDist={5}
                enabled={panEnabled}
                minPointers={1}
                maxPointers={1}
                avgTouches
                onGestureEvent={onPanEvent}
                ref={panRef}
                shouldCancelWhenOutside
                simultaneousHandlers={[pinchRef, rotationRef]}
              >
                <Animated.View style={tailwind('flex-1')}>
                  <RotationGestureHandler
                    ref={rotationRef}
                    onGestureEvent={onRotationEvent}
                    simultaneousHandlers={[pinchRef, panRef]}
                  >
                    <Animated.View style={tailwind('flex-1')}>
                      <PinchGestureHandler
                        ref={pinchRef}
                        onGestureEvent={onPinchEvent}
                        simultaneousHandlers={rotationRef}
                      >
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
                      </PinchGestureHandler>
                    </Animated.View>
                  </RotationGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    </View>
  );
};
