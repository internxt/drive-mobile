import { TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';

import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';

const NotEnoughDeviceSpaceModal = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();

  const isVisible = useAppSelector((state) => state.ui.showNotEnoughDeviceSpaceModal);

  const handleClose = () => {
    dispatch(uiActions.setShowNotEnoughDeviceSpaceModal(false));
  };

  return (
    <Modal
      isVisible={isVisible}
      onModalHide={handleClose}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      style={{ margin: 0, justifyContent: 'flex-end' }}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={250}
      animationOutTiming={250}
      backdropTransitionInTiming={250}
      backdropTransitionOutTiming={0}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      coverScreen={false}
    >
      <View style={tailwind('bg-transparent')}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View>
          <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
            <View style={tailwind('h-1 w-20 bg-gray-20 rounded-full')} />
          </View>

          <View style={tailwind('bg-white justify-center px-5 pt-3 pb-8')}>
            <AppText style={tailwind('text-center text-lg text-gray-100')} medium>
              {strings.modals.NotEnoughDeviceSpaceModal.title}
            </AppText>

            <View style={tailwind('flex-grow my-6')}>
              <AppText style={tailwind('text-sm text-center text-gray-50')}>
                {strings.modals.NotEnoughDeviceSpaceModal.advice}
              </AppText>
            </View>

            <TouchableHighlight
              underlayColor={getColor('text-gray-10')}
              style={tailwind('bg-gray-5 rounded-lg py-2 mx-6 items-center justify-center')}
              onPress={handleClose}
            >
              <AppText style={tailwind('text-lg text-gray-80')} medium>
                {strings.buttons.close}
              </AppText>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NotEnoughDeviceSpaceModal;
