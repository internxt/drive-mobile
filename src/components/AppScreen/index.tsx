import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import React from 'react';
import { Keyboard, Platform, StyleProp, View, ViewStyle, useColorScheme } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

interface AppScreenProps {
  backgroundColor?: string;
  safeAreaColor?: string;
  statusBarHidden?: boolean;
  statusBarTranslucent?: boolean;
  statusBarStyle?: StatusBarStyle;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  children?: React.ReactNode | React.ReactNode[];
  style?: StyleProp<ViewStyle>;
  hasBottomTabs?: boolean;
}

const AppScreen = (props: AppScreenProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const safeAreaInsets = useSafeAreaInsets();
  const propsStyle = Object.assign({}, props.style || {}) as Record<string, string>;

  const safeAreaColor = props.safeAreaColor || getColor('bg-surface');
  const backgroundColor = props.backgroundColor || getColor('bg-surface');

  const statusBarStyle = props.statusBarStyle || (isDark ? 'light' : 'dark');
  const statusBarBackgroundColor = Platform.OS === 'android' ? backgroundColor : undefined;
  const statusBarTranslucent = props.statusBarTranslucent ?? (Platform.OS === 'android' ? false : undefined);

  const onBackgroundPressed = () => {
    Keyboard.dismiss();
  };

  return (
    <View
      style={{
        paddingBottom: props.hasBottomTabs ? 0 : 0,
        backgroundColor,
        ...propsStyle,
      }}
    >
      <View
        style={{
          backgroundColor: safeAreaColor,
          paddingTop: props.safeAreaTop ? safeAreaInsets.top : 0,
        }}
      />

      <StatusBar
        hidden={props.statusBarHidden}
        style={statusBarStyle}
        translucent={statusBarTranslucent}
        backgroundColor={statusBarBackgroundColor}
      />

      {/* DISMISS KEYBOARD ON OUTSIDE TAP */}
      <TouchableWithoutFeedback onPress={onBackgroundPressed}>
        <View style={tailwind('absolute h-full w-full')}></View>
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

export default AppScreen;
