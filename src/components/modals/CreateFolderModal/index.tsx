import React, { useEffect, useState } from 'react'
import { View, Text, TouchableHighlight, TextInput, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native'
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux'

import { createFolder } from './CreateFolderUtils'
import { fileActions, layoutActions } from '../../../store/actions'
import { Reducers } from '../../../store/reducers/reducers'
import { getColor, tailwind } from '../../../helpers/designSystem'
import { FolderIcon, notify } from '../../../helpers'
import strings from '../../../../assets/lang/strings'
import globalStyle from '../../../styles/global.style'

function CreateFolderModal(props: Reducers) {
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showCreateFolderModal)
  const [folderName, setFolderName] = useState('Untitled folder')
  const [isLoading, setIsLoading] = useState(false)

  const emptyName = folderName === ''

  useEffect(() => {
    setIsOpen(props.layoutState.showCreateFolderModal)
  }, [props.layoutState.showCreateFolderModal])

  const createFolderHandle = () => {
    this.input.blur()
    setIsLoading(true)
    Keyboard.dismiss
    createFolder({ folderName, parentId: currentFolderId }).then(() => {
      props.dispatch(fileActions.getFolderContent(currentFolderId))
      notify({ type: 'success', text: 'Folder created' })
      setFolderName('')
    }).catch((err) => {
      notify({ type: 'error', text: err.message })
    }).finally(() => {
      props.dispatch(layoutActions.closeCreateFolderModal())
      setIsOpen(false)
      setIsLoading(false)
    });

  }

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={isOpen}
      onClosed={() => {
        setFolderName('Untitled folder');
        props.dispatch(layoutActions.closeCreateFolderModal())
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <KeyboardAvoidingView behavior={'padding'} >
        <View style={tailwind('h-full')}>
          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && props.dispatch(layoutActions.closeCreateFolderModal());
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>

          <View style={tailwind('flex-row w-full max-w-full')}>
            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && props.dispatch(layoutActions.closeCreateFolderModal());
              }}
            >
              <View style={tailwind('self-stretch w-8 -mr-8')} />
            </TouchableWithoutFeedback>

            <View style={tailwind('bg-white rounded-2xl mx-8 flex-grow p-4')}>
              <View style={tailwind('flex-grow justify-center px-12')}>
                {/*
                <View style={tailwind('pb-6')}>
                  <Text style={tailwind('text-lg text-neutral-500 font-medium text-center')}>{strings.screens.create_folder.title}</Text>
                </View>
                */}

                <View style={tailwind('pt-4 pb-8')}>
                  <View style={tailwind('items-center pb-3')}>
                    <FolderIcon width={80} height={80} />
                  </View>

                  <View style={[tailwind('items-center justify-center flex-shrink flex-grow bg-neutral-10 border border-neutral-30 px-4 rounded-lg'), Platform.OS !== 'android' && tailwind('pb-3')]}>
                    <TextInput
                      style={tailwind('text-lg text-center text-neutral-600')}
                      value={folderName}
                      onChangeText={value => setFolderName(value)}
                      placeholderTextColor={getColor('neutral-80')}
                      autoCompleteType='off'
                      selectTextOnFocus={true}
                      editable={!isLoading}
                      key='name'
                      ref={input => this.input = input}
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
                    !isLoading && props.dispatch(layoutActions.closeCreateFolderModal());
                  }}
                >
                  <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>{strings.generic.cancel}</Text>
                </TouchableHighlight>

                <View style={tailwind('px-1')}></View>

                <TouchableHighlight
                  underlayColor={getColor('blue-70')}
                  style={[tailwind('rounded-lg py-2 flex-grow items-center justify-center'), isLoading ? tailwind('bg-blue-30') : tailwind('bg-blue-60')]}
                  onPress={createFolderHandle}
                  disabled={isLoading}>
                  <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{isLoading ? strings.generic.creating : strings.generic.create}</Text>
                </TouchableHighlight>

              </View>
            </View>

            <TouchableWithoutFeedback
              onPress={() => {
                !isLoading && props.dispatch(layoutActions.closeCreateFolderModal());
              }}
            >
              <View style={tailwind('self-stretch w-8 -ml-8')} />
            </TouchableWithoutFeedback>
          </View>

          <TouchableWithoutFeedback
            onPress={() => {
              !isLoading && props.dispatch(layoutActions.closeCreateFolderModal());
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>

      {/*
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
              onPress={createFolderHandle}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-white')}>{strings.screens.create_folder.confirm}</Text>
            </TouchableHighlight>

          </View>
        </View>
      </KeyboardAvoidingView>
      */}
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(CreateFolderModal)