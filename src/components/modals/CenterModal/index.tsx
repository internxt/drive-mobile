import React from 'react';
import { Platform, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modalbox';

import { tailwind } from '../../../helpers/designSystem';

export interface CenterModalProps {
  isOpen: boolean;
  onClosed: () => void;
  children?: JSX.Element;
}

const CenterModal = (props: CenterModalProps): JSX.Element => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClosed={props.onClosed}
      position={'center'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      backButtonClose={true}
      backdropPressToClose={false}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback onPress={props.onClosed}>
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View style={tailwind('bg-white rounded-t-xl')}>{props.children}</View>
      </View>
    </Modal>
  );
};

export default CenterModal;
