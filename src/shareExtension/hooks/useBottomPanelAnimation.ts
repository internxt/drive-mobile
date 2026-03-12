import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

const PANEL_BOTTOM = 40;
const PANEL_MARGIN = 16;
const TAB_WIDTH = 44;

export const useBottomPanelAnimation = (isRenaming: boolean, screenWidth: number) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const keyboardBottom = useRef(new Animated.Value(PANEL_BOTTOM)).current;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (isRenaming) {
      const tid = setTimeout(() => {
        const metrics = Keyboard.metrics();
        const height = metrics?.height ?? 336;
        Animated.timing(keyboardBottom, {
          toValue: height + PANEL_BOTTOM,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 50);
      return () => clearTimeout(tid);
    } else {
      Animated.timing(keyboardBottom, {
        toValue: PANEL_BOTTOM,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isRenaming, keyboardBottom]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardBottom, {
        toValue: e.endCoordinates.height + PANEL_BOTTOM,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardBottom, {
        toValue: PANEL_BOTTOM,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardBottom]);

  const toggle = useCallback(() => {
    if (isRenaming) return;
    const next = !isCollapsed;
    setIsCollapsed(next);
    Animated.spring(slideAnimation, {
      toValue: next ? screenWidth - PANEL_MARGIN - TAB_WIDTH : 0,
      useNativeDriver: false,
      bounciness: 5,
      speed: 14,
    }).start();
  }, [isRenaming, isCollapsed, slideAnimation, screenWidth]);

  return { isCollapsed, keyboardBottom, slideAnimation, toggle };
};
