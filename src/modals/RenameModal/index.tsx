import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableHighlight, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import { rename, renameMeta } from './renameUtils';
import { FolderIcon, getFileTypeIcon, notify } from '../../helpers'

function RenameModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showRenameModal)
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false)

  const renameRef = useRef<TextInput>();

  const emptyName = newName === ''

  const isFolder = props.filesState.focusedItem?.parentId

  const folder = isFolder && props.filesState.focusedItem
  const file = !isFolder && props.filesState.focusedItem

  useEffect(() => {
    setIsOpen(props.layoutState.showRenameModal)
  }, [props.layoutState.showRenameModal])

  const renameHandle = () => {
    setIsLoading(true);
    props.dispatch(layoutActions.closeRenameModal())
    const params: renameMeta = { ifFolder: isFolder, itemId: isFolder ? folder.id : file.fileId, newName }

    rename(params).then(() => {
      props.dispatch(fileActions.getFolderContent(currentFolderId))
      notify({ text: 'Renamed successfully', type: 'success' });
      setNewName('');
    }).catch((err) => {
      notify({ text: err.message, type: 'error' });
    }).finally(() => {
      props.dispatch(layoutActions.closeRenameModal());
      props.dispatch(layoutActions.closeItemModal());
      setIsOpen(false);
      setIsLoading(false);
    });
  }

  const IconFile = getFileTypeIcon(props.filesState.focusedItem?.type);
  const IconFolder = FolderIcon;

  return (
    <Modal
      isOpen={isOpen}
      onClosed={() => {
        props.dispatch(layoutActions.closeRenameModal())
        setNewName('')
      }}
      onOpened={() => {
        setNewName(props.filesState.focusedItem?.name)
        renameRef.current.focus();
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
              <Text style={tailwind('text-lg text-neutral-500 font-semibold my-7 text-center')}>{strings.generic.rename}</Text>
            </View>
          </View>

          <View style={tailwind('flex-grow justify-center mx-12')}>
            <View style={tailwind('items-center')}>
              {isFolder ? <IconFolder width={64} height={64} /> : <IconFile width={64} height={64} />}
            </View>

            <View style={tailwind('items-center pb-6')}>
              <TextInput
                style={tailwind('text-lg text-center text-neutral-600 border-b-2 border-neutral-40 pb-1')}
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={getColor('neutral-500')}
                autoCapitalize='words'
                autoCompleteType='off'
                key='name'
                ref={renameRef}
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={tailwind('flex-row justify-between')}>

            <TouchableHighlight
              underlayColor={getColor('neutral-30')}
              style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={() => {
                props.dispatch(fileActions.deselectAll())
                props.dispatch(layoutActions.closeRenameModal())
              }}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
            </TouchableHighlight>

            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              style={tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={renameHandle}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-white')}>{strings.generic.rename}</Text>
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

export default connect(mapStateToProps)(RenameModal)