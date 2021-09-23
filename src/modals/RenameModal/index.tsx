import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableHighlight, TextInput, Platform } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import Separator from '../../components/Separator';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons';
import strings from '../../../assets/lang/strings';
import { rename, renameMeta } from './renameUtils';
import { notify } from '../../helpers'

function RenameModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showRenameModal)
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false)

  const emptyName = newName === ''

  const isFolder = props.filesState.focusedItem && !!props.filesState.focusedItem.parentId

  const folder = isFolder && props.filesState.focusedItem
  const file = !isFolder && props.filesState.focusedItem

  useEffect(() => {
    setIsOpen(props.layoutState.showRenameModal)
  }, [props.layoutState.showRenameModal])

  const renameHandle = () => {
    setIsLoading(true);
    const params: renameMeta = { ifFolder: isFolder, itemId: isFolder? folder.id : file.fileId, newName }

    rename(params).then(() => {
      props.dispatch(fileActions.getFolderContent(currentFolderId))
      notify({ text: 'Rename successfully', type: 'success' });
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

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={20}
      onClosed={() => {
        props.dispatch(layoutActions.closeRenameModal())
        setNewName('')
        setIsOpen(false)
      }}
      position={'bottom'}
      entry={'bottom'}
      coverScreen={Platform.OS === 'android'}
      style={styles.modalSettings}
      backButtonClose={true}
    >
      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

      <View style={styles.alignCenter}>
        <Text style={styles.modalTitle}>{strings.generic.rename} {props.filesState.focusedItem && props.filesState.focusedItem.name}</Text>
      </View>
      <Separator />
      <View style={styles.container}>
        <View style={[tailwind('input-wrapper'), styles.inputBox]}>
          <TextInput
            style={tailwind('input')}
            value={newName}
            onChangeText={value => setNewName(value)}
            placeholder={'Insert new name'}
            placeholderTextColor="#0F62FE"
            maxLength={64}
            autoCapitalize='words'
            autoCompleteType='off'
            key='name'
            autoCorrect={false}
          />
          <Unicons.UilEdit
            style={tailwind('input-icon')}
            color={'#0F62FE'} />
        </View>
        <TouchableHighlight
          style={[tailwind('btn btn-primary my-3'), emptyName || isLoading ? { backgroundColor: '#A6C8FF' } : null]}
          underlayColor="#4585f5"
          onPress={renameHandle}
          disabled={emptyName || isLoading}>
          <Text style={tailwind('text-base btn-label')}>{strings.generic.rename}</Text>
        </TouchableHighlight>
      </View>

      <Separator />

      <View>
        <TouchableHighlight
          underlayColor={'#eee'}
          style={{ alignItems: 'center', padding: 20 }}
          onPress={() => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeRenameModal())
          }}>
          <Text style={{ color: '#DA1E28' }}>{strings.generic.cancel}</Text>
        </TouchableHighlight>
      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSettings: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: 350
  },
  modalTitle: {
    color: '#42526E',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  alignCenter: { alignItems: 'center' },
  container: {
    paddingHorizontal: 40,
    paddingVertical: 10
  },
  inputBox: {
    borderTopColor: '#0F62FE',
    borderRightColor: '#0F62FE',
    borderBottomColor: '#0F62FE',
    borderLeftColor: '#0F62FE'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(RenameModal)