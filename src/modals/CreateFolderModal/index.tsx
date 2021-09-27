import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableHighlight, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import Modal from 'react-native-modalbox';
import { createFolder } from './CreateFolderUtils'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import { FolderIcon, notify } from '../../helpers';
import strings from '../../../assets/lang/strings';

function CreateFolderModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showCreateFolderModal)
  const [folderName, setFolderName] = useState('Untitled folder');
  const [isLoading, setIsLoading] = useState(false)

  const createInput = useRef<TextInput>();

  const emptyName = folderName === ''

  useEffect(() => {
    setIsOpen(props.layoutState.showCreateFolderModal)
  }, [props.layoutState.showCreateFolderModal])

  const createHandle = () => {
    setIsLoading(true);
    createFolder({ folderName, parentId: currentFolderId }).then(() => {
      props.dispatch(fileActions.getFolderContent(currentFolderId))
      notify({ type: 'success', text: 'Folder created' })
      setFolderName('');
    }).catch((err) => {
      notify({ type: 'error', text: err.message })
    }).finally(() => {
      props.dispatch(layoutActions.closeCreateFolderModal());
      setIsOpen(false);
      setIsLoading(false);
    });

  }

  return (
    <Modal
      isOpen={isOpen}
      onClosed={() => {
        setFolderName('Untitled folder');
        props.dispatch(layoutActions.closeCreateFolderModal())
      }}
      onOpened={() => {
        createInput.current.focus();
      }}
      position={'bottom'}
      entry={'bottom'}
      coverScreen={Platform.OS === 'android'}
      style={tailwind('rounded-t-xl p-3 h-80')}
      backButtonClose={true}
    >
      <KeyboardAvoidingView behavior={'padding'} >
        <View style={tailwind('h-full')}>
          <View>
            <View style={tailwind('h-1 bg-neutral-30 mt-1 w-16 self-center')}></View>
            <View>
              <Text style={tailwind('text-lg text-neutral-500 font-semibold my-7 text-center')}>{strings.screens.create_folder.title}</Text>
            </View>
          </View>

          <View style={tailwind('flex-grow justify-center')}>
            <View style={tailwind('items-center')}>
              <FolderIcon width={64} height={64} />
            </View>

            <View style={tailwind('items-center pb-6')}>
              <TextInput
                style={tailwind('text-lg text-center text-neutral-600 border-b-2 border-neutral-40 pb-1 mx-12')}
                value={folderName}
                onChangeText={value => setFolderName(value)}
                placeholder={'Folder name'}
                placeholderTextColor={getColor('neutral-500')}
                autoCapitalize='words'
                autoCompleteType='off'
                selectTextOnFocus={true}
                key='name'
                ref={createInput}
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={tailwind('flex-row justify-between')}>

            <TouchableHighlight
              underlayColor={getColor('neutral-30')}
              style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={() => {
                props.dispatch(layoutActions.closeCreateFolderModal());
              }}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
            </TouchableHighlight>

            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              style={tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={createHandle}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-white')}>{strings.screens.create_folder.confirm}</Text>
            </TouchableHighlight>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(CreateFolderModal)