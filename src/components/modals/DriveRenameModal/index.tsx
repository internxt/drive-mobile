import React, { useState } from 'react';
import { View, TouchableWithoutFeedback, TextInput, Platform } from 'react-native';

import { getColor, tailwind } from '../../../helpers/designSystem';
import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import errorService from '../../../services/error';
import AppButton from '../../AppButton';
import notificationsService from '../../../services/notifications';
import { NotificationType } from '../../../types';
import CenterModal from '../CenterModal';

function RenameModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { showRenameModal } = useAppSelector((state) => state.ui);
  const { focusedItem, currentFolderId } = useAppSelector((state) => state.drive);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFolder = focusedItem?.parentId;
  const folder = isFolder && focusedItem;
  const file = !isFolder && focusedItem;
  const onItemRenameSuccess = () => {
    if (currentFolderId) {
      dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
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

      if (isFolder) {
        await dispatch(
          driveThunks.updateFolderMetadataThunk({
            folder: folder as any,
            metadata: { itemName: newName },
          }),
        );
      } else {
        await dispatch(
          driveThunks.updateFileMetadataThunk({
            file: file as any,
            metadata: { itemName: newName },
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
                placeholderTextColor={getColor('neutral-500')}
                autoCompleteType="off"
                key="name"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        <View style={tailwind('flex-row justify-between')}>
          <AppButton
            title={strings.components.buttons.cancel}
            type={'cancel'}
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('px-1')}></View>

          <AppButton
            title={strings.generic.rename}
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