import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColor } from '../../helpers/designSystem';

interface AppScreenProps {
  backgroundColor?: string;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  children?: React.ReactNode | React.ReactNode[];
  style?: StyleProp<ViewStyle>;
}

const AppScreen = (props: AppScreenProps): JSX.Element => {
  const safeAreaInsets = useSafeAreaInsets();
  const propsStyle = Object.assign({}, props.style || {}) as Record<string, string>;

  return (
    <View
      style={{
        backgroundColor: props.backgroundColor || getColor('white'),
        paddingTop: props.safeAreaTop ? safeAreaInsets.top : 0,
        paddingBottom: props.safeAreaBottom ? safeAreaInsets.bottom : 0,
        ...propsStyle,
      }}
    >
      {props.children}
    </View>
  );
};

export default AppScreen;
