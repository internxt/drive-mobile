import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import errorService from '../../../services/ErrorService';
import AppButton from '../../AppButton';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import CenterModal from '../CenterModal';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import { useDrive } from '@internxt-mobile/hooks/drive';
import drive from '@internxt-mobile/services/drive';
import uuid from 'react-native-uuid';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
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

    if (driveCtx.currentFolder) {
      driveCtx.loadFolderContent(driveCtx.currentFolder.id, { pullFrom: ['cache'] });
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
        await drive.folder.updateMetaData(focusedItem.id, {
          itemName: newName,
        });
      } else if (focusedItem?.fileId && user) {
        await drive.file.updateMetaData(
          focusedItem.fileId,
          {
            itemName: newName,
          },
          user.bucket,
          // Picked from drive-web
          uuid.v4().toString(),
        );
      }

      // Update the item in the local DB
      if (focusedItem) {
        await drive.database.updateItemName(focusedItem?.id, newName);
      }

      onItemRenameSuccess();
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text1: castedError.message, type: NotificationType.Error });
    } finally {
      onItemRenameFinally();
    }
  };
  const IconFile = getFileTypeIcon(focusedItem?.type || '');
  const IconFolder = FolderIcon;
  const onClosed = () => {
    dispatch(uiActions.setShowRenameModal(false));
    setNewName('');
  };
  const onOpened = () => {
    setNewName(focusedItem?.name || '');
  };

  return (
    <CenterModal isOpen={showRenameModal} onClosed={onClosed} onOpened={onOpened}>
      <View style={tailwind('mx-8 flex-grow p-4')}>
        <View style={tailwind('flex-grow justify-center px-8')}>
          <View style={tailwind('pt-4 pb-8')}>
            <View style={tailwind('items-center pb-3')}>
              {isFolder ? <IconFolder width={80} height={80} /> : <IconFile width={80} height={80} />}
            </View>

            <View
              style={[
                tailwind('px-4 items-center justify-center flex-shrink flex-grow bg-neutral-10'),
                tailwind('border border-neutral-30 rounded-lg'),
                Platform.OS !== 'android' ? tailwind('pb-3') : tailwind(''),
              ]}
            >
              <TextInput
                style={tailwind('text-lg text-center text-neutral-600')}
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={getColor('text-neutral-500')}
                autoCompleteType="off"
                key="name"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        <View style={tailwind('flex-row justify-between')}>
          <AppButton
            title={strings.buttons.cancel}
            type={'cancel'}
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('px-1')}></View>

          <AppButton
            title={strings.buttons.rename}
            type={'accept'}
            onPress={onRenameButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
}

export default RenameModal;
