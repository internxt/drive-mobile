import React, { useEffect, useState } from 'react';
import { View, Text, TouchableHighlight, TouchableWithoutFeedback, TextInput, Platform, KeyboardAvoidingView, Easing } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import { rename, renameMeta } from './renameUtils';
import { FolderIcon, getFileTypeIcon, notify } from '../../helpers'
import globalStyle from '../../styles/global.style';

function RenameModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showRenameModal)
  const [newName, setNewName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isLoading, setIsLoading] = useState(false)

  const emptyName = newName === ''

  const isFolder = props.filesState.focusedItem?.parentId

  const folder = isFolder && props.filesState.focusedItem
  const file = !isFolder && props.filesState.focusedItem

  useEffect(() => {
    setIsOpen(props.layoutState.showRenameModal)
    setOriginalName('')
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
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={isOpen}
      onClosed={() => {
        props.dispatch(layoutActions.closeRenameModal())
        setNewName('')
      }}
      onOpened={() => {
        setNewName(props.filesState.focusedItem?.name)
        setOriginalName(newName)
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
      easing={Easing.inOut(Easing.exp)}
    >
      <KeyboardAvoidingView behavior={'padding'} >
        <View style={tailwind('h-full')}>
          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && props.dispatch(layoutActions.closeRenameModal())
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>

          <View style={tailwind('flex-row w-full max-w-full items-center justify-center')}>
            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && props.dispatch(layoutActions.closeRenameModal())
              }}
            >
              <View style={tailwind('self-stretch w-8 -mr-8')} />
            </TouchableWithoutFeedback>

            <View style={tailwind('bg-white rounded-2xl mx-8 flex-grow p-4')}>
              <View style={tailwind('flex-grow justify-center px-8')}>
                {/*
                <View style={tailwind('pb-6')}>
                  <Text numberOfLines={1} style={tailwind('text-lg text-neutral-500 font-medium text-center')}>{strings.generic.rename} "<Text numberOfLines={1} ellipsizeMode="tail">{originalName}</Text>"</Text>
                </View>
                */}

                <View style={tailwind('pt-4 pb-8')}>
                  <View style={tailwind('items-center pb-3')}>
                    {isFolder ? <IconFolder width={80} height={80} /> : <IconFile width={80} height={80} />}
                  </View>

                  <View style={tailwind('items-center justify-center flex-shrink flex-grow bg-neutral-10 border border-neutral-30 pb-3 px-4 rounded-lg')}>
                    <TextInput
                      style={tailwind('text-lg text-center text-neutral-600')}
                      value={newName}
                      onChangeText={setNewName}
                      placeholderTextColor={getColor('neutral-500')}
                      autoCompleteType='off'
                      key='name'
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
                    props.dispatch(fileActions.deselectAll())
                    props.dispatch(layoutActions.closeRenameModal())
                  }}
                  disabled={isLoading}>
                  <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>{strings.generic.cancel}</Text>
                </TouchableHighlight>

                <View style={tailwind('px-1')}></View>

                <TouchableHighlight
                  underlayColor={getColor('blue-70')}
                  style={tailwind('bg-blue-60 rounded-lg py-2 flex-grow items-center justify-center')}
                  onPress={renameHandle}
                  disabled={isLoading}>
                  <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{strings.generic.rename}</Text>
                </TouchableHighlight>

              </View>
            </View>

            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && props.dispatch(layoutActions.closeRenameModal())
              }}
            >
              <View style={tailwind('self-stretch w-8 -ml-8')} />
            </TouchableWithoutFeedback>
          </View>

          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && props.dispatch(layoutActions.closeRenameModal())
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(RenameModal)