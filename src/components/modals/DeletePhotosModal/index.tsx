import React from 'react';
import { View } from 'react-native';

import { BottomModalProps } from '../BottomModal';
import strings from '../../../../assets/lang/strings';
import AppButton from '../../AppButton';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../CenterModal';
import AppText from 'src/components/AppText';
import { PhotosItem } from '@internxt-mobile/types/photos';

interface DeletePhotosModalProps {
  data: PhotosItem[];
  isOpen: boolean;
  actions: {
    onConfirm: () => void;
    onClose: () => void;
  };
}

function DeletePhotosModal({ isOpen, actions }: DeletePhotosModalProps): JSX.Element {
  const tailwind = useTailwind();

  const onCancelButtonPressed = () => actions.onClose();

  const onClose = () => actions.onClose();

  return (
    <CenterModal isOpen={isOpen} onClosed={onClose}>
      <View style={tailwind('px-4 py-4')}>
        <AppText medium style={tailwind('text-xl text-gray-80 mb-4')}>
          {strings.modals.deletePhotosModal.title}
        </AppText>
        {/* ADVICE */}
        <AppText style={tailwind('text-lg text-gray-80 mb-6')}>{strings.modals.deletePhotosModal.message}</AppText>

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
            title={strings.buttons.delete}
            type="delete"
            onPress={actions.onConfirm}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
}

export default DeletePhotosModal;
