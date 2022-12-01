import React, { useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import drive from '@internxt-mobile/services/drive';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import { BaseModalProps } from '../../../types/ui';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';

interface CreateFolderModalProps extends BaseModalProps {
  onFolderCreated: () => void;
  onCancel: () => void;
  currentFolderId: number;
}
const CreateFolderModal: React.FC<CreateFolderModalProps> = (props) => {
  const tailwind = useTailwind();
  const driveCtx = useDrive();
  const [folderName, setFolderName] = useState(strings.screens.create_folder.defaultName);
  const [isLoading, setIsLoading] = useState(false);

  const onCancelButtonPressed = () => {
    if (isLoading) return;
    props.onCancel();
  };
  const onClosed = () => {
    setFolderName(strings.screens.create_folder.defaultName);
  };
  const onCreateFolderButtonPressed = () => {
    setIsLoading(true);

    drive.folder
      .createFolder(props.currentFolderId, folderName)
      .then((newFolder) => {
        driveLocalDB.saveFolderContent(newFolder, []).then(() => {
          driveCtx.loadFolderContent(props.currentFolderId);
          notificationsService.show({ type: NotificationType.Success, text1: strings.messages.folderCreated });
        });

        props.onFolderCreated();
      })
      .catch((err) => {
        notificationsService.show({ type: NotificationType.Error, text1: err.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={onClosed}>
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-6')} medium>
          {strings.modals.CreateFolder.title}
        </AppText>

        <AppTextInput
          containerStyle={tailwind('mb-8')}
          label={strings.inputs.name}
          value={folderName}
          onChangeText={(value) => setFolderName(value)}
          placeholder={strings.placeholders.folderName}
          autoCompleteType="off"
          selectTextOnFocus={true}
          editable={!isLoading}
          key="name"
          autoFocus={true}
          autoCorrect={false}
        />

        <View style={tailwind('flex-row justify-between')}>
          <AppButton
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('px-1')}></View>

          <AppButton
            title={isLoading ? strings.buttons.creating : strings.buttons.create}
            type="accept"
            onPress={onCreateFolderButtonPressed}
            loading={isLoading}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
};

export default CreateFolderModal;
