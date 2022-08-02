import React from 'react';
import { Keyboard, StyleProp, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
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
  const safeAreaInsets = useSafeAreaInsets();
  const propsStyle = Object.assign({}, props.style || {}) as Record<string, string>;
  const safeAreaColor = props.safeAreaColor || getColor('text-white');
  const backgroundColor = props.backgroundColor || getColor('text-white');
  const statusBarStyle = props.statusBarStyle || 'dark';
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
        translucent={props.statusBarTranslucent}
        backgroundColor={backgroundColor}
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
