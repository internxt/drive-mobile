import { useEffect } from 'react';
import { Easing, SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';

export const SELECTION_ANIMATION_DURATION_MS = 150;
export const SELECTION_ANIMATION_EASING = Easing.inOut(Easing.ease);
const SELECTION_TIMING = { duration: SELECTION_ANIMATION_DURATION_MS, easing: SELECTION_ANIMATION_EASING };

/**
 * Returns a shared value that animates from 0 to 1 when `isActive` turns true, and back when it turns false.
 */
export const useSelectionProgress = (isActive: boolean): SharedValue<number> => {
  const selectionProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(isActive ? 1 : 0, SELECTION_TIMING);
  }, [isActive]);

  return selectionProgress;
};
