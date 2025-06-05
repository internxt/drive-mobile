import { Easing, Platform, StyleProp, TouchableWithoutFeedback, useColorScheme, View, ViewStyle } from 'react-native';
import Modal from 'react-native-modalbox';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

export interface BottomModalProps {
  isOpen: boolean;
  onClosed: () => void;
  header?: JSX.Element;
  children?: JSX.Element | JSX.Element[];
  style?: StyleProp<ViewStyle>;
  modalStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  safeAreaColor?: string;
  height?: number;
  topDecoration?: boolean;
  backdropPressToClose?: boolean;
  backButtonClose?: boolean;
  ignoreSafeAreaBottom?: boolean;
  ignoreSafeAreaTop?: boolean;
  animationDuration?: number;
}

const BottomModal = (props: BottomModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const safeAreaInsets = useSafeAreaInsets();
  const safeAreaColor = props.safeAreaColor || getColor('bg-surface');

  const statusBarStyle = isDark ? 'light' : 'dark';
  const statusBarBackgroundColor =
    Platform.OS === 'android' ? (isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)') : undefined;

  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position="top"
      style={[
        { ...tailwind('bg-transparent'), paddingTop: props.ignoreSafeAreaTop ? 0 : safeAreaInsets.top },
        props.modalStyle,
      ]}
      backButtonClose={props.backButtonClose !== undefined ? props.backButtonClose : true}
      backdropPressToClose={props.backdropPressToClose}
      animationDuration={props.animationDuration || 250}
      easing={Easing.ease}
    >
      <View style={tailwind('h-full')}>
        <StatusBar
          style={statusBarStyle}
          translucent={Platform.OS === 'android'}
          backgroundColor={statusBarBackgroundColor}
        />

        <TouchableWithoutFeedback hitSlop={INCREASED_TOUCH_AREA} onPress={props.onClosed}>
          <View style={tailwind('flex-grow')}>
            <View style={tailwind('flex-grow')} />
            <TouchableWithoutFeedback>
              <View style={[tailwind('rounded-t-xl'), { backgroundColor: getColor('bg-surface') }, props.style]}>
                {props.topDecoration && (
                  <View style={tailwind('py-4 items-center')}>
                    <View style={[tailwind('rounded-full h-1 w-14'), { backgroundColor: getColor('bg-gray-10') }]} />
                  </View>
                )}
                {props.header && (
                  <View
                    style={[
                      tailwind('flex-row px-5 py-6 items-center justify-between overflow-hidden rounded-t-xl'),
                      props.headerStyle,
                    ]}
                  >
                    <View style={tailwind('flex-1')}>{props.header}</View>
                  </View>
                )}

                <View style={props.containerStyle}>{props.children}</View>
                <View
                  style={{
                    backgroundColor: safeAreaColor,
                    height: props.ignoreSafeAreaBottom ? 0 : safeAreaInsets.bottom,
                  }}
                ></View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

export default BottomModal;
