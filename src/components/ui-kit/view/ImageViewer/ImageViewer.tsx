import { useEffect, useRef } from 'react';
import { ImageSourcePropType, View, Animated, Image, Dimensions } from 'react-native';

import {
  HandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerEventPayload,
  PinchGestureHandler,
  PinchGestureHandlerEventPayload,
  RotationGestureHandler,
  RotationGestureHandlerEventPayload,
  State,
  TapGestureHandler,
  TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { useTailwind } from 'tailwind-rn/dist';

interface ImageViewerProps {
  source: ImageSourcePropType;
  onTapImage: () => void;
}

const useNativeDriver = true;
let lastRotate = 0;
let lastScale = 1;
let lastTranslate = { x: 0, y: 0 };
export const ImageViewer: React.FC<ImageViewerProps> = ({ source, onTapImage }) => {
  const tailwind = useTailwind();
  const baseScale = useRef(new Animated.Value(1)).current;
  const imageRef = useRef<Image>();
  const doubleTapRef = useRef();
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const rotateStr = rotate.interpolate({
    inputRange: [-100, 100],
    outputRange: ['-100rad', '100rad'],
  });

  const pinchRef = useRef();
  const panRef = useRef();
  const rotationRef = useRef();

  useEffect(() => {
    return () => {
      lastScale = 1;
      setScale({
        value: lastScale,
        shouldAnimate: false,
      });

      lastTranslate = { x: 0, y: 0 };
      setTranslate({
        value: {
          x: 0,
          y: 0,
        },
        shouldAnimate: false,
      });
    };
  }, []);
  const createNativeAnimatedEvent = (property: Animated.Mapping) =>
    Animated.event(
      [
        {
          nativeEvent: property,
        },
      ],
      { useNativeDriver },
    );

  // Zoom event
  const onPinchEvent = createNativeAnimatedEvent({ scale: pinchScale });

  // Move around event
  const onPanEvent = createNativeAnimatedEvent({
    translationX: translateX,
    translationY: translateY,
  });

  // Rotation event
  const onRotationEvent = createNativeAnimatedEvent({
    rotation: rotate,
  });

  const setScale = ({ value, shouldAnimate }: { value: number; shouldAnimate: boolean }) => {
    lastScale *= value;

    if (shouldAnimate) {
      Animated.spring(baseScale, {
        toValue: lastScale,
        useNativeDriver,
      }).start();
      Animated.spring(pinchScale, {
        toValue: 1,
        useNativeDriver,
      }).start();
    } else {
      baseScale.setValue(lastScale);
      pinchScale.setValue(1);
    }
  };

  const setTranslate = ({ value, shouldAnimate }: { value: { x: number; y: number }; shouldAnimate: boolean }) => {
    translateX.setOffset(value.x);
    translateY.setOffset(value.y);
    if (shouldAnimate) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver,
      }).start();
    } else {
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  const handlePinchStateChange = ({ nativeEvent }: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      setScale({
        value: nativeEvent.scale,
        shouldAnimate: false,
      });
    }

    // Reset the scale and the translate
    if (nativeEvent.state === State.END) {
      if (nativeEvent.scale <= 1) {
        lastScale = 1;
        setScale({
          value: lastScale,
          shouldAnimate: true,
        });

        lastTranslate = { x: 0, y: 0 };
        setTranslate({
          value: {
            x: 0,
            y: 0,
          },
          shouldAnimate: true,
        });
      }
    }
  };

  const isImageOutOfBounds = async (): Promise<{ x: boolean; y: boolean }> => {
    return new Promise((resolve) => {
      imageRef.current?.measureInWindow((x, y, width, height) => {
        const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
        const maxX = width - windowWidth;
        const maxY = height - windowHeight;
        const outX = Math.abs(x > 0 ? x + width / 2 : x) > maxX;
        const outY = Math.abs(y > 0 ? y + height / 2 : y) > maxY;
        resolve({ x: outX, y: outY });
      });
    });
  };
  const handleRotationStateChange = ({ nativeEvent }: HandlerStateChangeEvent<RotationGestureHandlerEventPayload>) => {
    if (nativeEvent.state === State.ACTIVE) {
      lastRotate += nativeEvent.rotation;
      rotate.setOffset(lastRotate);
      rotate.setValue(0);
    }

    if (nativeEvent.state === State.END) {
      rotate.setOffset(0);
      Animated.spring(rotate, {
        toValue: 0,
        useNativeDriver,
      }).start();
      lastRotate = 0;
    }
  };

  const handlePanningStateChange = ({ nativeEvent }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    if (nativeEvent.state === State.END) {
      isImageOutOfBounds().then(() => {
        lastTranslate = {
          x: lastTranslate.x + nativeEvent.translationX,
          y: lastTranslate.y + nativeEvent.translationY,
        };
        setTranslate({
          value: {
            x: lastTranslate.x,
            y: lastTranslate.y,
          },
          shouldAnimate: false,
        });
      });
    }
  };

  const handleTapEvent = ({ nativeEvent }: HandlerStateChangeEvent<TapGestureHandlerEventPayload>) => {
    if (nativeEvent.state === State.ACTIVE) {
      onTapImage();
    }
  };

  const handleDoubleTapEvent = ({ nativeEvent }: HandlerStateChangeEvent<TapGestureHandlerEventPayload>) => {
    if (nativeEvent.state === State.ACTIVE) {
      setScale({
        value: 1.5,
        shouldAnimate: true,
      });
    }
  };

  return (
    <View style={tailwind('flex-1 overflow-hidden')}>
      <TapGestureHandler onHandlerStateChange={handleTapEvent} waitFor={doubleTapRef}>
        <Animated.View style={tailwind('flex-1')}>
          <TapGestureHandler ref={doubleTapRef} onHandlerStateChange={handleDoubleTapEvent} numberOfTaps={2}>
            <Animated.View style={tailwind('flex-1')}>
              <PanGestureHandler
                minDist={5}
                minPointers={1}
                maxPointers={1}
                avgTouches
                onGestureEvent={onPanEvent}
                ref={panRef}
                shouldCancelWhenOutside
                onHandlerStateChange={handlePanningStateChange}
                simultaneousHandlers={[pinchRef, rotationRef]}
              >
                <Animated.View style={tailwind('flex-1')}>
                  <RotationGestureHandler
                    ref={rotationRef}
                    onGestureEvent={onRotationEvent}
                    simultaneousHandlers={[pinchRef, panRef]}
                    onHandlerStateChange={handleRotationStateChange}
                  >
                    <Animated.View style={tailwind('flex-1')}>
                      <PinchGestureHandler
                        ref={pinchRef}
                        onGestureEvent={onPinchEvent}
                        simultaneousHandlers={rotationRef}
                        onHandlerStateChange={handlePinchStateChange}
                      >
                        <Animated.Image
                          ref={imageRef}
                          source={source}
                          style={{
                            width: '100%',
                            height: '100%',
                            transform: [{ scale }, { translateX }, { translateY }, { rotate: rotateStr }],
                          }}
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
