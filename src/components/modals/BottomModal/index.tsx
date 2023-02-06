import React from 'react';
import { Easing, StyleProp, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Modal from 'react-native-modalbox';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';

export interface BottomModalProps {
  isOpen: boolean;
  onClosed: () => void;
  header?: JSX.Element;
  children?: JSX.Element | JSX.Element[];
  style?: StyleProp<ViewStyle>;
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
  const safeAreaInsets = useSafeAreaInsets();
  const safeAreaColor = props.safeAreaColor || getColor('text-white');

  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position="bottom"
      style={{ ...tailwind('bg-transparent'), paddingTop: props.ignoreSafeAreaTop ? 0 : safeAreaInsets.top }}
      backButtonClose={props.backButtonClose !== undefined ? props.backButtonClose : true}
      backdropPressToClose={props.backdropPressToClose}
      animationDuration={props.animationDuration || 250}
      easing={Easing.ease}
    >
      <View style={tailwind('h-full')}>
        <StatusBar translucent />

        <TouchableWithoutFeedback hitSlop={INCREASED_TOUCH_AREA} onPress={props.onClosed}>
          <View style={tailwind('flex-grow')}>
            <View style={tailwind('flex-grow')} />
            <TouchableWithoutFeedback>
              <View style={[tailwind('bg-white rounded-t-xl'), props.style]}>
                {props.topDecoration && (
                  <View style={tailwind('py-4 items-center')}>
                    <View style={tailwind('rounded-full h-1 w-14 bg-gray-10')} />
                  </View>
                )}
                {props.header && (
                  <View
                    style={[
                      tailwind(
                        'flex-row bg-gray-5 px-5 py-4 items-center justify-between overflow-hidden rounded-t-xl',
                      ),
                      props.headerStyle,
                    ]}
                  >
                    <View style={tailwind('flex-1')}>{props.header}</View>
                    <TouchableWithoutFeedback onPress={props.onClosed}>
                      <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                        <X weight="bold" color={getColor('text-neutral-60')} size={20} />
                      </View>
                    </TouchableWithoutFeedback>
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
