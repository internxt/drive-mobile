import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const NAV_SLIDE_OFFSET = 40;
const NAV_SLIDE_DURATION_MS = 220;
const NAV_FADE_DURATION_MS = 200;

interface UseNavAnimationResult {
  translateX: Animated.Value;
  contentOpacity: Animated.Value;
}

export const useNavAnimation = (currentFolderUuid: string, depth: number): UseNavAnimationResult => {
  const translateX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const prevDepthRef = useRef(1);
  const isFirstNavRef = useRef(true);

  useEffect(() => {
    if (isFirstNavRef.current) {
      isFirstNavRef.current = false;
      return;
    }

    const goingForward = depth > prevDepthRef.current;
    prevDepthRef.current = depth;

    translateX.setValue(goingForward ? NAV_SLIDE_OFFSET : -NAV_SLIDE_OFFSET);
    contentOpacity.setValue(0);

    const anim = Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: NAV_SLIDE_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: NAV_FADE_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [currentFolderUuid]);

  return { translateX, contentOpacity };
};
