import React from 'react';
import { View } from 'react-native';
import strings from '../../../../../assets/lang/strings';
import AppButton from '../../../AppButton';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../../CenterModal';
import AppText from 'src/components/AppText';
import { PhotosItem } from '@internxt-mobile/types/photos';

interface ConfirmSavePhotoModalProps {
  data: PhotosItem;
  isOpen: boolean;
  actions: {
    onConfirm: () => void;
    onClose: () => void;
  };
}

export const ConfirmSavePhotoModal: React.FC<ConfirmSavePhotoModalProps> = ({ isOpen, actions }) => {
  const tailwind = useTailwind();

  const onCancelButtonPressed = () => actions.onClose();

  const onClose = () => actions.onClose();

  return (
    <CenterModal isOpen={isOpen} onClosed={onClose}>
      <View style={tailwind('px-4 py-4')}>
        <AppText medium style={tailwind('text-xl text-gray-80 mb-4')}>
          {strings.modals.confirmSavePhoto.title}
        </AppText>
        {/* ADVICE */}
        <AppText style={tailwind('text-lg text-gray-80 mb-6')}>{strings.modals.confirmSavePhoto.message}</AppText>

        {/* ACTIONS */}
        <View style={tailwind('flex-row justify-center')}>
          <AppButton
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('w-3')} />

          <AppButton
            title={strings.buttons.duplicate}
            type="accept"
            onPress={actions.onConfirm}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
};
