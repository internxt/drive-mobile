import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Modal from 'react-native-modalbox';

import { createFolder } from './CreateFolderUtils';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon } from '../../../helpers';
import strings from '../../../../assets/lang/strings';
import globalStyle from '../../../styles/global.style';
import { notify } from '../../../services/toast';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';
import { filesThunks } from '../../../store/slices/storage';

function CreateFolderModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { folderContent } = useAppSelector((state) => state.files);
  const { showCreateFolderModal } = useAppSelector((state) => state.layout);
  const currentFolderId = folderContent && folderContent.currentFolder;
  const [isOpen, setIsOpen] = useState(showCreateFolderModal);
  const [folderName, setFolderName] = useState('Untitled folder');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsOpen(showCreateFolderModal);
  }, [showCreateFolderModal]);

  const createFolderHandle = () => {
    setIsLoading(true);
    Keyboard.dismiss;
    currentFolderId &&
      createFolder({ folderName, parentId: currentFolderId })
        .then(() => {
          dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolderId }));
          notify({ type: 'success', text: 'Folder created' });
          setFolderName('');
        })
        .catch((err) => {
          notify({ type: 'error', text: err.message });
        })
        .finally(() => {
          dispatch(layoutActions.setShowCreateFolderModal(false));
          setIsOpen(false);
          setIsLoading(false);
        });
  };

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={isOpen}
      onClosed={() => {
        setFolderName('Untitled folder');
        dispatch(layoutActions.setShowCreateFolderModal(false));
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <KeyboardAvoidingView behavior={'padding'}>
        <View style={tailwind('h-full')}>
          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>

          <View style={tailwind('flex-row w-full max-w-full')}>
            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
              }}
            >
              <View style={tailwind('self-stretch w-8 -mr-8')} />
            </TouchableWithoutFeedback>

            <View style={tailwind('bg-white rounded-2xl mx-8 flex-grow p-4')}>
              <View style={tailwind('flex-grow justify-center px-12')}>
                <View style={tailwind('pt-4 pb-8')}>
                  <View style={tailwind('items-center pb-3')}>
                    <FolderIcon width={80} height={80} />
                  </View>

                  <View
                    style={[
                      tailwind('px-4 items-center justify-center flex-shrink flex-grow bg-neutral-10'),
                      tailwind('border border-neutral-30 rounded-lg'),
                      Platform.OS !== 'android' && tailwind('pb-3'),
                    ]}
                  >
                    <TextInput
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
                </View>
              </View>

              <View style={tailwind('flex-row justify-between')}>
                <TouchableHighlight
                  underlayColor={getColor('neutral-30')}
                  style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
                  onPress={() => {
                    !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
                  }}
                >
                  <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>
                    {strings.generic.cancel}
                  </Text>
                </TouchableHighlight>

                <View style={tailwind('px-1')}></View>

                <TouchableHighlight
                  underlayColor={getColor('blue-70')}
                  style={[
                    tailwind('rounded-lg py-2 flex-grow items-center justify-center'),
                    isLoading ? tailwind('bg-blue-30') : tailwind('bg-blue-60'),
                  ]}
                  onPress={createFolderHandle}
                  disabled={isLoading}
                >
                  <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>
                    {isLoading ? strings.generic.creating : strings.generic.create}
                  </Text>
                </TouchableHighlight>
              </View>
            </View>

            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
              }}
            >
              <View style={tailwind('self-stretch w-8 -ml-8')} />
            </TouchableWithoutFeedback>
          </View>

          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && dispatch(layoutActions.setShowCreateFolderModal(false));
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default CreateFolderModal;
