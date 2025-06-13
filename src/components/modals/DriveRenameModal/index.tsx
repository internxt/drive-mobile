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

  const onItemRenameSuccess = () => {
    /**
     * Weird stuff over here
     *
     * Looks like updateMetadata endpoint responds
     * but the file is not renamed yet, so we will
     * update the item in the DB and will update
     * the DB with the next network request later
     * hopefully the drive item will be renamed
     * already
     *
     * NOTE: Drive server returns the updated
     * item, however the SDK does not return it
     * Should update the SDK to return it
     */

    if (driveCtx.focusedFolder) {
      driveCtx.loadFolderContent(driveCtx.focusedFolder.uuid, { pullFrom: ['network'], resetPagination: true });
    }

    notificationsService.show({ text1: strings.messages.renamedSuccessfully, type: NotificationType.Success });
    setNewName('');
  };

  const onItemRenameFinally = () => {
    dispatch(uiActions.setShowRenameModal(false));
    dispatch(uiActions.setShowItemModal(false));
    setIsLoading(false);
  };

  const onCancelButtonPressed = () => {
    dispatch(driveActions.deselectAll());
    dispatch(uiActions.setShowRenameModal(false));
  };

  const onRenameButtonPressed = async () => {
    try {
      setIsLoading(true);

      if (focusedItem && isFolder) {
        // TODO: Move to a useCase
        if (focusedItem?.uuid) await drive.folder.updateMetaData(focusedItem.uuid, newName);
      } else if (focusedItem?.uuid && user) {
        await drive.file.updateMetaData(focusedItem.uuid, newName);
      }

      // Update the item in the local DB
      if (focusedItem) {
        await drive.database.updateItemName(focusedItem?.id, newName);
        dispatch(
          driveActions.setFocusedItem({
            ...focusedItem,
            name: newName,
          }),
        );
      }

      onItemRenameSuccess();
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text1: castedError.message, type: NotificationType.Error });
    } finally {
      onItemRenameFinally();
    }
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
