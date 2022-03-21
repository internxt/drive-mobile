import React from 'react';
import { Keyboard, StyleProp, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';

import { tailwind, getColor } from '../../helpers/designSystem';

interface AppScreenProps {
  backgroundColor?: string;
  statusBarHidden?: boolean;
  statusBarTranslucent?: boolean;
  statusBarStyle?: StatusBarStyle;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  children?: React.ReactNode | React.ReactNode[];
  style?: StyleProp<ViewStyle>;
}

const AppScreen = (props: AppScreenProps): JSX.Element => {
  const safeAreaInsets = useSafeAreaInsets();
  const propsStyle = Object.assign({}, props.style || {}) as Record<string, string>;
  const backgroundColor = props.backgroundColor || getColor('white');
  const onBackgroundPressed = () => {
    Keyboard.dismiss();
  };

  return (
    <View
      style={{
        backgroundColor,
        paddingTop: props.safeAreaTop ? safeAreaInsets.top : 0,
        paddingBottom: props.safeAreaBottom ? safeAreaInsets.bottom : 0,
        ...propsStyle,
      }}
    >
      <StatusBar
        hidden={props.statusBarHidden}
        style={props.statusBarStyle}
        translucent={props.statusBarTranslucent}
        backgroundColor={backgroundColor}
      />

      {/* DISMISS KEYBOARD ON OUTSIDE TAP */}
      <TouchableWithoutFeedback onPress={onBackgroundPressed}>
        <View style={tailwind('absolute h-full w-full')}></View>
      </TouchableWithoutFeedback>

      {props.children}
    </View>
  );
};

export default AppScreen;
