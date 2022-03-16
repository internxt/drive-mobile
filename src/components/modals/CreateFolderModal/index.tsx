import React, { useState } from 'react';
import { View, Keyboard, Platform } from 'react-native';

import { createFolder } from './CreateFolderUtils';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon } from '../../../helpers';
import strings from '../../../../assets/lang/strings';
import { notify } from '../../../services/toast';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';
import { storageThunks } from '../../../store/slices/storage';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';

function CreateFolderModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { currentFolderId } = useAppSelector((state) => state.storage);
  const { showCreateFolderModal } = useAppSelector((state) => state.layout);
  const [folderName, setFolderName] = useState(strings.screens.create_folder.defaultName);
  const [isLoading, setIsLoading] = useState(false);
  const onCancelButtonPressed = () => {
    !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
  };
  const onClosed = () => {
    setFolderName(strings.screens.create_folder.defaultName);
    dispatch(layoutActions.setShowCreateFolderModal(false));
  };
  const onCreateFolderButtonPressed = () => {
    setIsLoading(true);

    Keyboard.dismiss;
    createFolder({ folderName, parentId: currentFolderId })
      .then(() => {
        dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
        notify({ type: 'success', text: strings.messages.folderCreated });
      })
      .catch((err) => {
        notify({ type: 'error', text: err.message });
      })
      .finally(() => {
        setIsLoading(false);
        onClosed();
      });
  };

  return (
    <CenterModal isOpen={showCreateFolderModal} onClosed={onClosed}>
      <View style={tailwind('w-full p-4')}>
        <View style={tailwind('w-full px-10 pt-4 pb-8 flex-grow justify-center')}>
          <View style={tailwind('items-center pb-3')}>
            <FolderIcon width={80} height={80} />
          </View>

          <AppTextInput
            containerStyle={[
              tailwind('border border-neutral-30 items-center justify-center flex-shrink flex-grow bg-neutral-10'),
              Platform.OS !== 'android' && tailwind('pb-3'),
            ]}
            style={tailwind('text-lg text-center text-neutral-600')}
            value={folderName}
            onChangeText={(value) => setFolderName(value)}
            placeholderTextColor={getColor('neutral-80')}
            autoCompleteType="off"
            selectTextOnFocus={true}
            editable={!isLoading}
            key="name"
            autoFocus={true}
            autoCorrect={false}
          />
        </View>

        <View style={tailwind('flex-row justify-between')}>
          <AppButton
            title={strings.components.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('px-1')}></View>

          <AppButton
            title={isLoading ? strings.generic.creating : strings.generic.create}
            type="accept"
            onPress={onCreateFolderButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
}

export default CreateFolderModal;
