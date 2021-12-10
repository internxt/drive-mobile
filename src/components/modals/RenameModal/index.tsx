import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Modal from 'react-native-modalbox';

import { getColor, tailwind } from '../../../helpers/designSystem';
import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global.style';
import { notify } from '../../../services/toast';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { filesActions, filesThunks } from '../../../store/slices/files';
import { layoutActions } from '../../../store/slices/layout';
import errorService from '../../../services/error';

function RenameModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { showRenameModal } = useAppSelector((state) => state.layout);
  const { focusedItem, folderContent } = useAppSelector((state) => state.files);
  const currentFolderId = folderContent && folderContent.currentFolder;
  const [newName, setNewName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFolder = focusedItem?.parentId;
  const folder = isFolder && focusedItem;
  const file = !isFolder && focusedItem;
  const onItemRenameSuccess = () => {
    if (currentFolderId) {
      dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolderId }));
    }
    notify({ text: 'Renamed successfully', type: 'success' });
    setNewName('');
  };
  const onItemRenameFinally = () => {
    dispatch(layoutActions.setShowRenameModal(false));
    dispatch(layoutActions.setShowItemModal(false));
    setIsLoading(false);
  };
  const onRenameButtonPressed = async () => {
    try {
      setIsLoading(true);

      if (isFolder) {
        await dispatch(
          filesThunks.updateFolderMetadataThunk({
            folder: folder,
            metadata: { itemName: newName },
          }),
        );
      } else {
        await dispatch(
          filesThunks.updateFileMetadataThunk({
            file: file,
            metadata: { itemName: newName },
          }),
        );
      }

      onItemRenameSuccess();
    } catch (err) {
      const castedError = errorService.castError(err);
      notify({ text: castedError.message, type: 'error' });
    } finally {
      onItemRenameFinally();
    }
  };
  const IconFile = getFileTypeIcon(focusedItem?.type);
  const IconFolder = FolderIcon;

  useEffect(() => {
    setOriginalName('');
  }, [showRenameModal]);

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={showRenameModal}
      onClosed={() => {
        dispatch(layoutActions.setShowRenameModal(false));
        setNewName('');
      }}
      onOpened={() => {
        setNewName(focusedItem?.name);
        setOriginalName(newName);
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <KeyboardAvoidingView behavior={'padding'}>
        <View style={tailwind('h-full')}>
          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && dispatch(layoutActions.setShowRenameModal(false));
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>

          <View style={tailwind('flex-row w-full max-w-full items-center justify-center')}>
            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && dispatch(layoutActions.setShowRenameModal(false));
              }}
            >
              <View style={tailwind('self-stretch w-8 -mr-8')} />
            </TouchableWithoutFeedback>

            <View style={tailwind('bg-white rounded-2xl mx-8 flex-grow p-4')}>
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
                      autoFocus={true}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>

              <View style={tailwind('flex-row justify-between')}>
                <TouchableHighlight
                  underlayColor={getColor('neutral-30')}
                  style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
                  onPress={() => {
                    dispatch(filesActions.deselectAll());
                    dispatch(layoutActions.setShowRenameModal(false));
                  }}
                  disabled={isLoading}
                >
                  <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>
                    {strings.generic.cancel}
                  </Text>
                </TouchableHighlight>

                <View style={tailwind('px-1')}></View>

                <TouchableHighlight
                  underlayColor={getColor('blue-70')}
                  style={tailwind('bg-blue-60 rounded-lg py-2 flex-grow items-center justify-center')}
                  onPress={onRenameButtonPressed}
                  disabled={isLoading}
                >
                  <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>
                    {strings.generic.rename}
                  </Text>
                </TouchableHighlight>
              </View>
            </View>

            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && dispatch(layoutActions.setShowRenameModal(false));
              }}
            >
              <View style={tailwind('self-stretch w-8 -ml-8')} />
            </TouchableWithoutFeedback>
          </View>

          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && dispatch(layoutActions.setShowRenameModal(false));
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default RenameModal;
