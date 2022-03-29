import React from 'react';
import { View, Text, TouchableHighlight } from 'react-native';
import prettysize from 'prettysize';

import strings from '../../../../assets/lang/strings';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { storageThunks } from '../../../store/slices/storage';
import { layoutActions } from '../../../store/slices/layout';
import BottomModal from '../BottomModal';

function DeleteItemModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { currentFolderId, focusedItem: item } = useAppSelector((state) => state.storage);
  const { showDeleteModal } = useAppSelector((state) => state.layout);
  const isFolder = item && !!item.parentId;
  const FileIcon = getFileTypeIcon(item?.type);
  const handleDeleteSelectedItem = () => {
    currentFolderId && dispatch(storageThunks.deleteItemsThunk({ items: [item], folderToReload: currentFolderId }));
  };

  return (
    <BottomModal
      isOpen={showDeleteModal}
      onClosed={() => {
        dispatch(layoutActions.setShowDeleteModal(false));
      }}
    >
      <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
        <View style={tailwind('h-1 w-20 bg-neutral-30 rounded-full')} />
      </View>

      <View style={tailwind('bg-white justify-center py-3')}>
        <Text style={[tailwind('text-center text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>
          {strings.modals.delete_modal.title}
        </Text>
        <Text style={tailwind('text-center text-sm text-neutral-100')}>{strings.modals.delete_modal.warning}</Text>

        <View style={tailwind('items-center my-8')}>
          {isFolder ? <FolderIcon width={80} height={80} /> : <FileIcon width={80} height={80} />}
          <Text
            style={[tailwind('text-base text-neutral-500 mt-3 px-10'), globalStyle.fontWeight.medium]}
            numberOfLines={1}
            ellipsizeMode={'middle'}
          >
            {item?.name}
            {item?.type ? '.' + item.type : ''}
          </Text>

          <Text style={tailwind('text-neutral-100')}>
            {!isFolder && (
              <>
                {prettysize(item?.size)}
                <Text style={globalStyle.fontWeight.bold}> · </Text>
              </>
            )}
            Updated{' '}
            {new Date(item?.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View style={tailwind('flex-row justify-between bg-white p-3')}>
        <TouchableHighlight
          underlayColor={getColor('neutral-30')}
          style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
          onPress={() => {
            dispatch(layoutActions.setShowDeleteModal(false));
          }}
        >
          <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>
            {strings.components.buttons.cancel}
          </Text>
        </TouchableHighlight>

        <View style={tailwind('px-1')}></View>

        <TouchableHighlight
          underlayColor={getColor('red-70')}
          style={tailwind('bg-red-60 rounded-lg py-2 flex-grow items-center justify-center')}
          onPress={() => {
            handleDeleteSelectedItem();
            dispatch(layoutActions.setShowDeleteModal(false));
          }}
        >
          <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{strings.generic.delete}</Text>
        </TouchableHighlight>
      </View>
    </BottomModal>
  );
}

export default DeleteItemModal;
