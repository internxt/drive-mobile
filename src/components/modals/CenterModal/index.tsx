import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Keyboard, Platform, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modalbox';
import { useKeyboard } from 'src/hooks/useKeyboard';
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
  const { keyboardShown, coordinates } = useKeyboard();

  const getModalTop = () => {
    if (!keyboardShown || Platform.OS === 'android') return 0;

    const screenHeight = Dimensions.get('window').height;
    return -(screenHeight - coordinates.end.height) / 4;
  };

  const tailwind = useTailwind();
  const onBackdropPressed = () => {
    backdropPressToClose && onClosed();
  };

  const handleOnClose = () => {
    // Dismiss the keyboard in case the modal has
    // a focused form inside
    Keyboard.dismiss();
    onClosed();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClosed={handleOnClose}
      onOpened={onOpened}
      position={'center'}
      style={[tailwind('bg-transparent'), { top: getModalTop() }]}
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
