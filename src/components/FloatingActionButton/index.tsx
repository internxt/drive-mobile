import { PencilSimpleIcon, PlusIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import globalStyle from '../../styles/global';
import { FLOATING_BUTTON_BOTTOM, FLOATING_BUTTON_MARGIN, FLOATING_BUTTON_SIZE } from './floatingButtonLayout';

const PLUS_ICON_SIZE = 26;
const PENCIL_ICON_SIZE = 24;
const LABEL_LEFT_PADDING = 20;
const MENU_OPEN_ROTATION_DEGREES = 45;
const ROTATION_DURATION = 250;
const RESIZE_DURATION = 300;
const ICON_SWAP_DURATION = 200;
const LABEL_FADE_DURATION = 150;
const PRESSED_SCALE = 0.94;
const SHADOW = '0px 6px 20px rgba(0, 102, 255, 0.38), 0px 2px 6px rgba(0, 0, 0, 0.12)';

export type FloatingActionButtonMode = 'upload' | 'compose';

interface FloatingActionButtonProps {
  mode: FloatingActionButtonMode;
  isLabelShown: boolean;
  isMenuOpen: boolean;
  onPress: () => void;
}

const FloatingActionButton = ({ mode, isLabelShown, isMenuOpen, onPress }: FloatingActionButtonProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();
  useLanguage();

  const plusRotation = useSharedValue(0);

  useEffect(() => {
    plusRotation.value = withTiming(isMenuOpen ? MENU_OPEN_ROTATION_DEGREES : 0, { duration: ROTATION_DURATION });
  }, [isMenuOpen, plusRotation]);

  const plusIconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${plusRotation.value}deg` }] }));

  const isComposeMode = mode === 'compose';
  const uploadAccessibilityLabel = isMenuOpen
    ? strings.components.floatingActionButton.closeUploadMenu
    : strings.components.floatingActionButton.openUploadMenu;

  return (
    <Animated.View
      layout={LinearTransition.duration(RESIZE_DURATION)}
      style={[
        styles.container,
        {
          backgroundColor: getColor('text-primary'),
          boxShadow: SHADOW,
          bottom: FLOATING_BUTTON_BOTTOM + safeAreaInsets.bottom,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isComposeMode ? strings.components.floatingActionButton.compose : uploadAccessibilityLabel}
        accessibilityState={isComposeMode ? {} : { expanded: isMenuOpen }}
        onPress={onPress}
        style={({ pressed }) => [
          tailwind('flex-row items-center justify-end'),
          { transform: [{ scale: pressed ? PRESSED_SCALE : 1 }] },
        ]}
      >
        {isComposeMode && isLabelShown && (
          <Animated.Text
            entering={FadeIn.duration(LABEL_FADE_DURATION)}
            exiting={FadeOut.duration(LABEL_FADE_DURATION)}
            numberOfLines={1}
            style={[
              tailwind('text-base'),
              globalStyle.fontWeight.semibold,
              { color: getColor('text-white'), paddingLeft: LABEL_LEFT_PADDING },
            ]}
          >
            {strings.components.floatingActionButton.compose}
          </Animated.Text>
        )}
        <Animated.View style={[tailwind('items-center justify-center'), styles.iconSlot]}>
          {isComposeMode ? (
            <Animated.View
              key="compose"
              entering={ZoomIn.duration(ICON_SWAP_DURATION)}
              exiting={ZoomOut.duration(ICON_SWAP_DURATION)}
            >
              <PencilSimpleIcon color={getColor('text-white')} size={PENCIL_ICON_SIZE} weight="bold" />
            </Animated.View>
          ) : (
            <Animated.View
              key="upload"
              entering={ZoomIn.duration(ICON_SWAP_DURATION)}
              exiting={ZoomOut.duration(ICON_SWAP_DURATION)}
            >
              <Animated.View style={plusIconStyle}>
                <PlusIcon color={getColor('text-white')} size={PLUS_ICON_SIZE} weight="bold" />
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: FLOATING_BUTTON_MARGIN,
    height: FLOATING_BUTTON_SIZE,
    minWidth: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  iconSlot: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
  },
});

export default FloatingActionButton;
