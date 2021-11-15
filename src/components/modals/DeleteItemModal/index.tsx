import React, { useEffect, useState } from 'react';
import { View, Text, Platform, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import prettysize from 'prettysize';

import { fileActions, layoutActions } from '../../../redux/actions';
import { Reducers } from '../../../redux/reducers/reducers';
import strings from '../../../../assets/lang/strings';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global.style';

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
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={isOpen}
      onClosed={() => {
        props.dispatch(layoutActions.closeDeleteModal())
        setIsOpen(false)
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >

      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            props.dispatch(layoutActions.closeDeleteModal())
          }}
        >
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View>

          <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
            <View style={tailwind('h-1 w-20 bg-neutral-30 rounded-full')} />
          </View>

          <View style={tailwind('bg-white justify-center py-3')}>

            <Text style={[tailwind('text-center text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>{strings.modals.delete_modal.title}</Text>
            <Text style={tailwind('text-center text-sm text-neutral-100')}>{strings.modals.delete_modal.warning}</Text>

            <View style={tailwind('items-center my-8')}>
              {isFolder ? <FolderIcon width={80} height={80} /> : <FileIcon width={80} height={80} />}
              <Text style={[tailwind('text-base text-neutral-500 mt-3'), globalStyle.fontWeight.medium]} numberOfLines={1} ellipsizeMode={'middle'} >{item?.name}{item?.type ? '.' + item.type : ''}</Text>

              <Text style={tailwind('text-neutral-100')}>
                {
                  !isFolder && <>{prettysize(item?.size)}<Text style={globalStyle.fontWeight.bold}>  ·  </Text></>
                }
                Updated {
                  new Date(item?.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                }
              </Text>
            </View>

          </View>

          <View style={tailwind('flex-row justify-between bg-white p-3')}>

            <TouchableHighlight
              underlayColor={getColor('neutral-30')}
              style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
              onPress={() => {
                props.dispatch(layoutActions.closeDeleteModal())
              }}
            >
              <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>{strings.generic.cancel}</Text>
            </TouchableHighlight>

            <View style={tailwind('px-1')}></View>

            <TouchableHighlight
              underlayColor={getColor('red-70')}
              style={tailwind('bg-red-60 rounded-lg py-2 flex-grow items-center justify-center')}
              onPress={() => {
                handleDeleteSelectedItem();
                props.dispatch(layoutActions.closeDeleteModal())
              }}
            >
              <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{strings.generic.delete}</Text>
            </TouchableHighlight>

          </View>

        </View>

      </View>
    </Modal >
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(DeleteItemModal)