import React, { useMemo, useState } from 'react';
import { View, Platform } from 'react-native';

import { FolderIcon } from '../../../helpers';
import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import folderService from '../../../services/DriveFolderService';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import { BaseModalProps } from '../../../types/ui';
import { useAppSelector } from '../../../store/hooks';
import { useTailwind } from 'tailwind-rn';

interface CreateFolderModalProps extends BaseModalProps {
  onFolderCreated: () => void;
  onCancel: () => void;
  currentFolderId: number;
}
const CreateFolderModal: React.FC<CreateFolderModalProps> = (props) => {
  const tailwind = useTailwind();
  const [folderName, setFolderName] = useState(strings.screens.create_folder.defaultName);
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useAppSelector((state) => state.auth);
  useMemo(() => folderService.initialize(token, user?.mnemonic || ''), []);
  const onCancelButtonPressed = () => {
    if (isLoading) return;
    props.onCancel();
  };
  const onClosed = () => {
    setFolderName(strings.screens.create_folder.defaultName);
  };
  const onCreateFolderButtonPressed = () => {
    setIsLoading(true);

    folderService
      .createFolder(props.currentFolderId, folderName)
      .then(() => {
        notificationsService.show({ type: NotificationType.Success, text1: strings.messages.folderCreated });
        props.onFolderCreated();
      })
      .catch((err) => {
        notificationsService.show({ type: NotificationType.Error, text1: err.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  const iconSize = 80;

  return (
    <CenterModal isOpen={props.isOpen} onClosed={onClosed}>
      <View style={tailwind('w-full p-4')}>
        <View style={tailwind('w-full px-10 pt-4 pb-8 flex-grow justify-center')}>
          <View style={tailwind('items-center pb-3')}>
            <FolderIcon width={iconSize} height={iconSize} />
          </View>

          <AppTextInput
            containerStyle={[
              tailwind(
                'border border-neutral-30 rounded-lg items-center justify-center flex-shrink flex-grow bg-neutral-10',
              ),
              Platform.OS !== 'android' && tailwind('pb-3'),
            ]}
            style={tailwind('text-lg text-center text-neutral-600')}
            value={folderName}
            onChangeText={(value) => setFolderName(value)}
            placeholderTextColor={tailwind('text-neutral-80').color as string}
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
            title={isLoading ? strings.generic.creating : strings.components.buttons.create}
            type="accept"
            onPress={onCreateFolderButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
};

export default CreateFolderModal;
