import { Icon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import { FLOATING_BUTTON_BOTTOM, FLOATING_BUTTON_MARGIN, FLOATING_BUTTON_SIZE } from './floatingButtonLayout';

const MENU_GAP_ABOVE_BUTTON = 12;
const ACTIONS_GAP = 10;
const PRESSED_OPACITY = 0.7;
const ACTION_BUTTON_SIZE = 44;
const ACTION_ICON_SIZE = 22;
const SCRIM_COLOR = 'rgba(0, 0, 0, 0.28)';
const SCRIM_FADE_DURATION = 250;
const ACTION_ENTRY_DURATION = 220;
const ACTION_ENTRY_STAGGER = 35;
const ACTION_SHADOW = '0px 2px 10px rgba(0, 0, 0, 0.14)';

export interface FloatingMenuAction {
  key: string;
  label: string;
  icon: Icon;
  onPress: () => void;
}

interface FloatingActionMenuProps {
  isOpen: boolean;
  actions: FloatingMenuAction[];
  onClose: () => void;
}

const FloatingActionMenu = ({ isOpen, actions, onClose }: FloatingActionMenuProps): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(SCRIM_FADE_DURATION)}
      exiting={FadeOut.duration(SCRIM_FADE_DURATION)}
      style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR }]}
    >
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          tailwind('absolute items-end'),
          {
            right: FLOATING_BUTTON_MARGIN,
            bottom: FLOATING_BUTTON_BOTTOM + safeAreaInsets.bottom + FLOATING_BUTTON_SIZE + MENU_GAP_ABOVE_BUTTON,
            gap: ACTIONS_GAP,
          },
        ]}
      >
        {actions.map((action, index) => {
          const ActionIcon = action.icon;
          const entryDelay = (actions.length - 1 - index) * ACTION_ENTRY_STAGGER;
          return (
            <Animated.View key={action.key} entering={FadeInDown.duration(ACTION_ENTRY_DURATION).delay(entryDelay)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [tailwind('flex-row items-center'), { opacity: pressed ? PRESSED_OPACITY : 1 }]}
              >
                <View
                  style={[
                    tailwind('rounded-xl px-3.5 py-2 mr-3'),
                    { backgroundColor: getColor('bg-surface'), boxShadow: ACTION_SHADOW },
                  ]}
                >
                  <AppText medium style={[tailwind('text-base'), { color: getColor('text-gray-100') }]}>
                    {action.label}
                  </AppText>
                </View>
                <View
                  style={[
                    tailwind('items-center justify-center rounded-full'),
                    {
                      width: ACTION_BUTTON_SIZE,
                      height: ACTION_BUTTON_SIZE,
                      backgroundColor: getColor('bg-surface'),
                      boxShadow: ACTION_SHADOW,
                    },
                  ]}
                >
                  <ActionIcon color={getColor('text-primary')} size={ACTION_ICON_SIZE} />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
};

export default FloatingActionMenu;
