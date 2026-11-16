import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import React from 'react';
import { Keyboard, StyleProp, View, ViewStyle, useColorScheme } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useGetColor from '../../hooks/useColor';
import { cssInterop } from 'nativewind';

interface AppScreenProps {
  backgroundColor?: string;
  safeAreaColor?: string;
  statusBarHidden?: boolean;
  statusBarStyle?: StatusBarStyle;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  children?: React.ReactNode | React.ReactNode[];
  style?: StyleProp<ViewStyle>;
  className?: string;
  hasBottomTabs?: boolean;
}

const AppScreen = (props: AppScreenProps): JSX.Element => {
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const safeAreaInsets = useSafeAreaInsets();
  const propsStyle = Object.assign({}, props.style || {}) as Record<string, string>;

  const safeAreaColor = props.safeAreaColor || getColor('bg-surface');
  const backgroundColor = props.backgroundColor || getColor('bg-surface');

  const statusBarStyle = props.statusBarStyle || (isDark ? 'light' : 'dark');

  const onBackgroundPressed = () => {
    Keyboard.dismiss();
  };

  return (
    <View
      className="flex-1"
      style={[
        {
          paddingBottom: props.hasBottomTabs ? 0 : 0,
          backgroundColor,
        },
        propsStyle,
      ]}
    >
      <View
        style={{
          backgroundColor: safeAreaColor,
          paddingTop: props.safeAreaTop ? safeAreaInsets.top : 0,
        }}
      />

      <StatusBar hidden={props.statusBarHidden} style={statusBarStyle} />

      {/* DISMISS KEYBOARD ON OUTSIDE TAP */}
      <TouchableWithoutFeedback onPress={onBackgroundPressed}>
        <View className="absolute h-full w-full" />
      </TouchableWithoutFeedback>

      {props.children}

      <View
        style={{
          backgroundColor: safeAreaColor,
          paddingBottom: props.safeAreaBottom ? safeAreaInsets.bottom : 0,
        }}
      />
    </View>
  );
};

cssInterop(AppScreen, { className: 'style' });

export default AppScreen;
