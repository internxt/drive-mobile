import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, Platform } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../helpers';

function DeleteItemModal(props: Reducers) {
  const selectedItems = props.filesState.selectedItems
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showDeleteModal)

  const item = props.filesState.focusedItem

  useEffect(() => {
    setIsOpen(props.layoutState.showDeleteModal)
  }, [props.layoutState.showDeleteModal])

  const handleDeleteSelectedItem = () => {
    props.dispatch(fileActions.deleteItems([props.filesState.focusedItem], currentFolderId))
  }

  const isFolder = item && !!item.parentId

  const FileIcon = getFileTypeIcon(item?.type);

  return (
    <Modal
      isOpen={isOpen}
      coverScreen={Platform.OS === 'android'}
      onClosed={() => {
        props.dispatch(layoutActions.closeDeleteModal())
        setIsOpen(false)
      }}
      position='bottom'
      style={tailwind('rounded-lg p-3 h-2/4')}
    >

      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

      <View>
        <View>
          <Text style={tailwind('text-center my-4 text-lg font-semibold text-neutral-500')}>{strings.modals.delete_modal.title}</Text>
        </View>

        <View style={tailwind('items-center my-3')}>
          {isFolder ? <FolderIcon width={64} height={64} /> : <FileIcon width={64} height={64} />}
          <Text style={tailwind('my-3')}>{item && item.name}</Text>
        </View>

        <View>
          <Text style={tailwind('my-8 text-center text-neutral-500 mx-4')}>{item && item.name} {strings.modals.delete_modal.warning}</Text>
        </View>

        <View style={tailwind('flex-row justify-between')}>

          <TouchableOpacity
            style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
            onPress={() => {
              props.dispatch(layoutActions.closeDeleteModal())
            }}
          >
            <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center')}
            onPress={() => {
              handleDeleteSelectedItem();
              props.dispatch(layoutActions.closeDeleteModal())
            }}
          >
            <Text style={tailwind('text-base font-bold text-white')}>{strings.modals.share_modal.share}</Text>
          </TouchableOpacity>

        </View>

      </View>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(DeleteItemModal)