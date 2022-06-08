import React from 'react';
import { Text, View } from 'react-native';
import { Photo } from '@internxt/sdk/dist/photos';

import globalStyle from '../../../styles/global';
import BottomModal, { BottomModalProps } from '../BottomModal';
import strings from '../../../../assets/lang/strings';
import AppButton from '../../AppButton';
import { useAppDispatch } from '../../../store/hooks';
import { photosThunks } from '../../../store/slices/photos';
import { useTailwind } from 'tailwind-rn';

interface DeletePhotosModalProps extends BottomModalProps {
  data: Photo[];
  onPhotosDeleted?: () => void;
}

function DeletePhotosModal({ isOpen, onClosed, data, onPhotosDeleted }: DeletePhotosModalProps): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const onCancelButtonPressed = () => {
    onClosed();
  };
  const onMoveToTrashButtonPressed = async () => {
    await dispatch(photosThunks.deletePhotosThunk({ photos: data }));
    onPhotosDeleted?.();
    onClosed();
  };

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed}>
      <Text
        style={[
          tailwind('w-full text-center mt-10 mb-4 text-xl font-semibold text-neutral-500'),
          globalStyle.fontWeight.medium,
        ]}
      >
        {strings.modals.deletePhotosModal.title}
      </Text>
      {/* ADVICE */}
      <Text style={[tailwind('mb-6 px-9 text-center text-sm text-neutral-100'), globalStyle.fontWeight.medium]}>
        {strings.modals.deletePhotosModal.message}
      </Text>

      {/* ACTIONS */}
      <View style={tailwind('p-3 flex-row justify-center')}>
        <AppButton
          title={strings.components.buttons.cancel}
          type="cancel"
          onPress={onCancelButtonPressed}
          style={tailwind('flex-1')}
        />

        <View style={tailwind('w-2')} />

        <AppButton
          title={strings.components.buttons.moveToThrash}
          type="delete"
          onPress={onMoveToTrashButtonPressed}
          style={tailwind('flex-1')}
        />
      </View>
    </BottomModal>
  );
}

export default DeletePhotosModal;
