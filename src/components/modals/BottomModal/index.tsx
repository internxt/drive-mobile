import React from 'react';
import { Easing, StyleProp, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Modal from 'react-native-modalbox';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';

export interface BottomModalProps {
  isOpen: boolean;
  onClosed: () => void;
  header?: JSX.Element;
  children?: JSX.Element | JSX.Element[];
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  safeAreaColor?: string;
  height?: number;
}

const BottomModal = (props: BottomModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const safeAreaInsets = useSafeAreaInsets();
  const safeAreaColor = props.safeAreaColor || (tailwind('text-white').color as string);

  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position="bottom"
      style={{ ...tailwind('bg-transparent'), paddingTop: safeAreaInsets.top }}
      backButtonClose={true}
      backdropPressToClose={false}
      animationDuration={250}
      easing={Easing.ease}
    >
      <View style={tailwind('h-full')}>
        <StatusBar translucent />

        <TouchableWithoutFeedback onPress={props.onClosed}>
          <View style={tailwind('flex-grow')}>
            <View style={tailwind('flex-grow')} />
            <TouchableWithoutFeedback>
              <View style={[tailwind('bg-white rounded-t-xl'), props.style]}>
                {props.header && (
                  <View style={tailwind('flex-row px-5 py-4 items-center justify-between')}>
                    <View style={tailwind('flex-1')}>{props.header}</View>
                    <TouchableWithoutFeedback onPress={props.onClosed}>
                      <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                        <X weight="bold" color={tailwind('text-neutral-60').color as string} size={20} />
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                )}

                <View style={props.containerStyle}>{props.children}</View>
                <View style={{ backgroundColor: safeAreaColor, height: safeAreaInsets.bottom }}></View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

export default BottomModal;
