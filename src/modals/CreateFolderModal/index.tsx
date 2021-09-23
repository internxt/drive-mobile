import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableHighlight, TextInput, Platform } from 'react-native';
import Modal from 'react-native-modalbox';
import { createFolder } from './CreateFolderUtils'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import Separator from '../../components/Separator';
import SettingsItem from '../SettingsModal/SettingsItem';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons';
import { notify } from '../../helpers';
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
      swipeArea={20}
      onClosed={() => {
        props.dispatch(layoutActions.closeCreateFolderModal())
      }}
      position={'bottom'}
      entry={'bottom'}
      coverScreen={Platform.OS === 'android'}
      style={styles.modalSettings}
      backButtonClose={true}
    >
      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>
      <View style={styles.alignCenter}>
        <Text style={styles.modalTitle}>{strings.screens.create_folder.title}</Text>
      </View>
      <Separator />
      <View style={styles.container}>
        <View style={[tailwind('input-wrapper'), styles.inputBox]}>
          <TextInput
            style={tailwind('input')}
            value={folderName}
            onChangeText={value => setFolderName(value)}
            placeholder={'Insert folder name'}
            placeholderTextColor="#0F62FE"
            maxLength={64}
            autoCapitalize='words'
            autoCompleteType='off'
            key='name'
            autoCorrect={false}
          />
          <Unicons.UilFolderMedical
            style={tailwind('input-icon')}
            color={'#0F62FE'} />
        </View>
        <TouchableHighlight
          style={[tailwind('btn btn-primary my-3'), emptyName || isLoading ? { backgroundColor: '#A6C8FF' } : null]}
          underlayColor="#4585f5"
          onPress={createHandle}
          disabled={emptyName || isLoading}>
          <Text style={tailwind('text-base btn-label')}>{strings.screens.create_folder.title}</Text>
        </TouchableHighlight>
      </View>

      <Separator />
      <View style={styles.cancelContainer}>
        <SettingsItem
          text={<Text style={styles.cancelText}>{strings.generic.cancel}</Text>}
          onPress={() => {
            props.dispatch(layoutActions.closeCreateFolderModal());
          }}
        />
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
  cancelText: {
    color: '#f00',
    textAlign: 'center',
    flexGrow: 1,
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 19,
    fontWeight: '500'
  },
  modalTitle: {
    color: '#42526E',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  cancelContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    flexGrow: 1,
    marginBottom: 16
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

export default connect(mapStateToProps)(CreateFolderModal)