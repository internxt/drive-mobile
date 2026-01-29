import { StatusBar } from 'expo-status-bar';
import { Keyboard, Platform, TouchableWithoutFeedback, View, ViewStyle, useColorScheme } from 'react-native';
import Modal from 'react-native-modal';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

export interface CenterModalProps {
  isOpen: boolean;
  backdropPressToClose?: boolean;
  backButtonClose?: boolean;
  onClosed: () => void;
  onOpened?: () => void;
  children?: JSX.Element;
  style?: ViewStyle;
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
  style,
}: CenterModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isTranslucent = Platform.OS === 'android';

  const handleOnClose = () => {
    Keyboard.dismiss();
    onClosed();
  };

  const statusBarStyle = isDark ? 'light' : 'dark';

  return (
    <Modal
      isVisible={isOpen}
      onModalHide={handleOnClose}
      onModalShow={onOpened}
      onBackdropPress={backdropPressToClose ? handleOnClose : undefined}
      onBackButtonPress={backButtonClose ? handleOnClose : undefined}
      style={{ margin: 0, justifyContent: 'flex-start' }}
      animationInTiming={250}
      animationOutTiming={250}
      backdropTransitionInTiming={250}
      backdropTransitionOutTiming={0}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating={false}
      coverScreen={false}
    >
      <StatusBar style={statusBarStyle} translucent={isTranslucent} />

      <TouchableWithoutFeedback onPress={backdropPressToClose ? handleOnClose : undefined}>
        <View style={[tailwind('px-5 flex-grow justify-center items-center')]}>
          <TouchableWithoutFeedback>
            <View style={[tailwind('w-full rounded-xl'), { backgroundColor: getColor('bg-surface') }, style]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CenterModal;
