import { useRef } from 'react';
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
  withSpring,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  interpolate,
  useAnimatedRef,
  runOnJS,
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
export const ImageViewer: React.FC<ImageViewerProps> = ({ source, onTapImage, onZoomImage, onImageViewReset }) => {
  const tailwind = useTailwind();
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
        translateY.value = withSpring(limits.top, {
          stiffness: 60,
        });
      }
      if (outOf.bottom) {
        translateY.value = withSpring(limits.bottom, {
          stiffness: 60,
        });
      }
      if (outOf.left) {
        translateX.value = withSpring(limits.left, {
          stiffness: 60,
        });
      }
      if (outOf.right) {
        translateX.value = withSpring(limits.right, {
          stiffness: 60,
        });
      }
    });
  };
  // Zoom event
  const onPinchEvent = useAnimatedGestureHandler<GestureEvent<PinchGestureHandlerEventPayload>, PinchGestureContext>({
    onStart(event, context) {
      context.scale = scale.value;
      runOnJS(onZoomImage)();
    },
    onActive(event, context) {
      scale.value = event.scale * context.scale;
    },
    onEnd(event) {
      if (event.scale < 1) {
        scale.value = withSpring(1, {
          stiffness: 80,
          mass: 0.1,
          overshootClamping: true,
        });
        rotate.value = 0;
        translateX.value = 0;
        translateY.value = 0;
        runOnJS(onImageViewReset)();
      }
    },
  });

  // Move around event
  const onPanEvent = useAnimatedGestureHandler<GestureEvent<PanGestureHandlerEventPayload>, PanGestureContext>({
    onStart(_, context) {
      context.translationX = translateX.value;
      context.translationY = translateY.value;
    },
    onActive(event, context) {
      translateX.value = event.translationX + context.translationX;
      translateY.value = event.translationY + context.translationY;
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
      rotate.value = withSpring(0, {
        stiffness: 60,
        overshootClamping: true,
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
        scale.value = withSpring(scale.value * 1.5, {
          stiffness: 60,
        });
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
