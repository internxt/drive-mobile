import { Animated, Easing } from 'react-native';

export const DEFAULT_EASING = Easing.bezier(0, 0, 0.58, 1);

type AnimationsRefs = {
  copyLinkActionsHeight: Animated.Value;
  copyLinkActionsOpacity: Animated.Value;
  saveActionsHeight: Animated.Value;
  saveActionsOpacity: Animated.Value;
  passwordModeHeight: Animated.Value;
  passwordModeOpacity: Animated.Value;
};
export const animations = ({
  copyLinkActionsHeight,
  copyLinkActionsOpacity,
  saveActionsHeight,
  saveActionsOpacity,
  passwordModeHeight,
  passwordModeOpacity,
}: AnimationsRefs) => {
  const displayCopyActions = (display: boolean) => {
    const durationActions = 250;
    if (display) {
      displaySaveActions(false);
    }
    Animated.timing(copyLinkActionsHeight, {
      toValue: display ? 56 : 0,
      useNativeDriver: false,
      duration: durationActions,
      easing: DEFAULT_EASING,
    }).start();
    Animated.timing(copyLinkActionsOpacity, {
      toValue: display ? 1 : 0,
      useNativeDriver: false,
      duration: durationActions,
      easing: DEFAULT_EASING,
    }).start();
  };
  const displaySaveActions = (display: boolean) => {
    const durationActions = 250;

    if (display) {
      displayCopyActions(false);
    }
    Animated.timing(saveActionsHeight, {
      toValue: display ? 56 : 0,
      useNativeDriver: false,
      duration: durationActions,
      easing: DEFAULT_EASING,
    }).start();
    Animated.timing(saveActionsOpacity, {
      toValue: display ? 1 : 0,
      useNativeDriver: false,
      duration: durationActions,
      easing: DEFAULT_EASING,
    }).start();
  };

  const displayPasswordMode = (display: boolean) => {
    const inputDuration = 250;
    Animated.timing(passwordModeHeight, {
      easing: DEFAULT_EASING,
      duration: inputDuration,
      toValue: display ? 68 : 0,
      useNativeDriver: false,
    }).start();
    Animated.timing(passwordModeOpacity, {
      easing: DEFAULT_EASING,
      duration: inputDuration,
      toValue: display ? 1 : 0,
      useNativeDriver: false,
    }).start();
  };
  return {
    displaySaveActions,
    displayCopyActions,
    displayPasswordMode,
  };
};
