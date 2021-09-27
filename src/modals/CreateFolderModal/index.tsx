import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
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
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false)

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
        setFolderName('');
        props.dispatch(layoutActions.closeCreateFolderModal())
      }}
      position={'bottom'}
      entry={'bottom'}
      coverScreen={Platform.OS === 'android'}
      style={tailwind('rounded-xl p-3 h-80')}
      backButtonClose={true}
    >
      <KeyboardAvoidingView behavior={'position'} >
        <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>
        <View>
          <Text style={tailwind('text-lg text-neutral-500 font-semibold my-7 text-center')}>{strings.screens.create_folder.title}</Text>
        </View>

        <View style={tailwind('items-center')}>
          <FolderIcon width={64} height={64} />
        </View>

        <View style={tailwind('items-center pb-6 flex-grow')}>
          <TextInput
            style={tailwind('text-lg text-neutral-600 border-b border-neutral-40 pb-0.5')}
            value={folderName}
            onChangeText={value => setFolderName(value)}
            placeholder={'Folder name'}
            placeholderTextColor={getColor('neutral-500')}
            maxLength={64}
            autoCapitalize='words'
            autoCompleteType='off'
            key='name'
            autoCorrect={false}
          />
        </View>

        <View style={tailwind('flex-row justify-between')}>

          <TouchableOpacity
            style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
            onPress={() => {
              props.dispatch(layoutActions.closeCreateFolderModal());
            }}
            disabled={isLoading}>
            <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center')}
            onPress={createHandle}
            disabled={isLoading}>
            <Text style={tailwind('text-base font-bold text-white')}>{strings.screens.create_folder.confirm}</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(CreateFolderModal)