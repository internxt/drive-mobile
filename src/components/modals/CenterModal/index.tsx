import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Easing, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modalbox';
import { useTailwind } from 'tailwind-rn';

export interface CenterModalProps {
  isOpen: boolean;
  backdropPressToClose?: boolean;
  backButtonClose?: boolean;
  onClosed: () => void;
  onOpened?: () => void;
  children?: JSX.Element;
}

const defaultProps: Partial<CenterModalProps> = {
  backdropPressToClose: true,
  backButtonClose: true,
};

const CenterModal = ({
  isOpen,
  onClosed,
  onOpened,
  children,
  backdropPressToClose = defaultProps.backdropPressToClose,
  backButtonClose = defaultProps.backButtonClose,
}: CenterModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const onBackdropPressed = () => {
    backdropPressToClose && onClosed();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClosed={onClosed}
      onOpened={onOpened}
      position="center"
      style={tailwind('bg-transparent')}
      backButtonClose={backButtonClose}
      backdropPressToClose={false}
      animationDuration={250}
      easing={Easing.ease}
    >
      <View style={tailwind('h-full')}>
        <StatusBar hidden translucent />

        <TouchableWithoutFeedback onPress={onBackdropPressed}>
          <View style={tailwind('px-8 flex-grow justify-center items-center')}>
            <TouchableWithoutFeedback>
              <View style={tailwind(' w-full bg-white rounded-xl')}>{children}</View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

export default CenterModal;
