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
  containerStyle?: StyleProp<ViewStyle>;
}

const BottomModal = (props: BottomModalProps): JSX.Element => {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position={'bottom'}
      style={{ ...tailwind('bg-transparent'), paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom }}
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

        <View style={tailwind('bg-white rounded-t-xl')}>
          {props.header && (
            <View style={tailwind('flex-row px-5 py-4 items-center justify-between border-b border-neutral-20')}>
              {props.header}
              <View>
                <TouchableWithoutFeedback onPress={props.onClosed}>
                  <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                    <X color={getColor('neutral-60')} size={24} />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          )}

          <View style={props.containerStyle}>{props.children}</View>
        </View>
      </View>
    </Modal>
  );
};

export default BottomModal;
