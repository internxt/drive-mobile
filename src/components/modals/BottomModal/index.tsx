import React from 'react';
import { Easing, StyleProp, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Modal from 'react-native-modalbox';

import { getColor, tailwind } from '../../../helpers/designSystem';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';

export interface BottomModalProps {
  isOpen: boolean;
  onClosed: () => void;
  header?: JSX.Element;
  children?: JSX.Element | JSX.Element[];
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  safeAreaColor?: string;
}

const BottomModal = (props: BottomModalProps): JSX.Element => {
  const safeAreaInsets = useSafeAreaInsets();
  const safeAreaColor = props.safeAreaColor || getColor('white');

  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position={'bottom'}
      style={{ ...tailwind('bg-transparent'), paddingTop: safeAreaInsets.top }}
      backButtonClose={true}
      backdropPressToClose={false}
      animationDuration={250}
      easing={Easing.ease}
    >
      <View style={tailwind('h-full')}>
        <StatusBar hidden={true} />

        <TouchableWithoutFeedback onPress={props.onClosed}>
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View style={[tailwind('bg-white rounded-t-xl'), props.style]}>
          {props.header && (
            <View style={tailwind('flex-row px-5 py-4 items-center justify-between border-b border-neutral-20')}>
              <View style={tailwind('flex-1')}>{props.header}</View>
              <TouchableWithoutFeedback onPress={props.onClosed}>
                <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                  <X color={getColor('neutral-60')} size={24} />
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}

          <View style={props.containerStyle}>{props.children}</View>
          <View style={{ backgroundColor: safeAreaColor, height: safeAreaInsets.bottom }}></View>
        </View>
      </View>
    </Modal>
  );
};

export default BottomModal;
