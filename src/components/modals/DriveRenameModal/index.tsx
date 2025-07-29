import { useState } from 'react';
import { View } from 'react-native';

import Portal from '@burstware/react-native-portal';
import { useDrive } from '@internxt-mobile/hooks/drive';
import drive from '@internxt-mobile/services/drive';
import AppText from 'src/components/AppText';
import AppTextInput from 'src/components/AppTextInput';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { logger } from '../../../services/common';
import errorService from '../../../services/ErrorService';
import notificationsService from '../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import { NotificationType } from '../../../types';
import AppButton from '../../AppButton';
import CenterModal from '../CenterModal';

function RenameModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const { user } = useAppSelector((state) => state.auth);

  const { showRenameModal } = useAppSelector((state) => state.ui);
  const { focusedItem } = useAppSelector((state) => state.drive);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFolder = focusedItem?.type ? false : true;

  const onRenameButtonPressed = async () => {
    if (!focusedItem || !user || !driveCtx.focusedFolder) return;

    const originalName = focusedItem.name;
    const trimmedNewName = newName.trim();

    if (!trimmedNewName || trimmedNewName === originalName) {
      dispatch(uiActions.setShowRenameModal(false));
      return;
    }

    try {
      setIsLoading(true);
      dispatch(
        driveActions.setFocusedItem({
          ...focusedItem,
          name: trimmedNewName,
        }),
      );
      driveCtx.updateItemInTree(driveCtx.focusedFolder.uuid, focusedItem.id, {
        name: trimmedNewName,
        plainName: trimmedNewName,
      });

      await drive.database.updateItemName(focusedItem.id, trimmedNewName);
      if (isFolder && focusedItem.uuid) {
        await drive.folder.updateMetaData(focusedItem.uuid, trimmedNewName);
      } else if (focusedItem.uuid) {
        await drive.file.updateMetaData(focusedItem.uuid, trimmedNewName);
      }

      notificationsService.show({
        text1: strings.messages.renamedSuccessfully,
        type: NotificationType.Success,
      });

      dispatch(uiActions.setShowRenameModal(false));
      dispatch(uiActions.setShowItemModal(false));
      setNewName('');
    } catch (err) {
      try {
        driveCtx.updateItemInTree(driveCtx.focusedFolder.uuid, focusedItem.id, {
          name: originalName,
          plainName: originalName,
        });
        dispatch(
          driveActions.setFocusedItem({
            ...focusedItem,
            name: originalName,
          }),
        );

        await drive.database.updateItemName(focusedItem.id, originalName);
      } catch (dbError) {
        logger.error('Error reverting database update:', dbError);
      }

      const castedError = errorService.castError(err);
      notificationsService.show({
        text1: castedError.message,
        type: NotificationType.Error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCancelButtonPressed = () => {
    dispatch(driveActions.deselectAll());
    dispatch(uiActions.setShowRenameModal(false));
  };

  const onClosed = () => {
    dispatch(uiActions.setShowRenameModal(false));
    setNewName('');
  };

  const onOpened = () => {
    setNewName(focusedItem?.name || '');
  };

  return (
    <Portal>
      <CenterModal backdropPressToClose={false} isOpen={showRenameModal} onClosed={onClosed} onOpened={onOpened}>
        <View style={tailwind('flex-grow px-4 py-4')}>
          <AppText medium style={[tailwind('mb-4 text-xl'), { color: getColor('text-gray-100') }]}>
            {strings.modals.rename.title}
          </AppText>
          <View style={tailwind('flex-grow justify-center mb-5')}>
            <AppTextInput
              label={strings.modals.rename.label}
              value={newName}
              autoFocus
              onChangeText={setNewName}
              placeholderTextColor={getColor('text-gray-50')}
              autoComplete="off"
              key="name"
              autoCorrect={false}
            />
          </View>

          <View style={tailwind('flex-row justify-between')}>
            <AppButton
              title={strings.buttons.cancel}
              type="white"
              onPress={onCancelButtonPressed}
              disabled={isLoading}
              style={tailwind('flex-1')}
            />

            <View style={tailwind('w-3')}></View>

            <AppButton
              loading={isLoading}
              title={strings.buttons.rename}
              type={'accept'}
              onPress={onRenameButtonPressed}
              disabled={isLoading}
              style={tailwind('flex-1')}
            />
          </View>
        </View>
      </CenterModal>
    </Portal>
  );
}

export default RenameModal;
