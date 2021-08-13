import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableHighlight, TextInput } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import Separator from '../../components/Separator';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons';
import strings from '../../../assets/lang/strings';

function RenameModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showRenameModal)
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false)

  const emptyName = newName === ''

  const isFolder = props.filesState.selectedFile && !!props.filesState.selectedFile.parentId

  const folder = isFolder && props.filesState.selectedFile
  const file = !isFolder && props.filesState.selectedFile

  useEffect(() => {
    props.layoutState.showRenameModal ? setIsOpen(true) : null
  }, [props.layoutState])

  const renameHandle = () => {
    setIsLoading(false);
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
      coverScreen={true}
      style={styles.modalSettings}
      backButtonClose={true}
    >
      <View style={styles.drawerKnob}></View>
      <View style={styles.alignCenter}>
        <Text style={styles.modalTitle}>{strings.generic.rename} {props.filesState.selectedFile && props.filesState.selectedFile.name}</Text>
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
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#0F62FE',
    borderRadius: 4,
    height: 4,
    margin: 12,
    width: 50
  },
  modalTitle: {
    color: '#42526E',
    fontFamily: 'Neue-Einstellung',
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