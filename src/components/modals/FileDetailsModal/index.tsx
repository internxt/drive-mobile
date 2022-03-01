import prettysize from 'prettysize';
import React from 'react';
import { Text, View } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import strings from '../../../../assets/lang/strings';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global.style';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';
import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';

function FileDetailsModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { focusedItem: item } = useAppSelector((state) => state.storage);
  const { showItemModal } = useAppSelector((state) => state.layout);

  if (!item) {
    return <></>;
  }

  const isFolder = !item.fileId;
  const FileIcon = getFileTypeIcon(item?.type);
  const header = (
    <>
      <View style={tailwind('mr-3')}>
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-neutral-500'), globalStyle.fontWeight.medium]}
        >
          {item?.name}
          {item?.type ? '.' + item.type : ''}
        </Text>
        <Text style={tailwind('text-xs text-neutral-100')}>
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
    </>
  );

  return (
    <BottomModal
      isOpen={showItemModal}
      onClosed={() => dispatch(layoutActions.setShowItemModal(false))}
      header={header}
    >
      <View style={tailwind('bg-neutral-10 p-4 flex-grow')}>
        <View style={tailwind('rounded-xl bg-white')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.generic.rename}</Text>
              </View>
            }
            rightSlot={<Unicons.UilEditAlt size={20} color={getColor('neutral-500')} />}
            onPress={() => {
              dispatch(layoutActions.setShowItemModal(false));
              dispatch(layoutActions.setShowRenameModal(true));
            }}
          />

          {!isFolder && (
            <BottomModalOption
              leftSlot={
                <View style={tailwind('flex-grow')}>
                  <Text style={tailwind('text-lg text-neutral-500')}>
                    {strings.components.file_and_folder_options.share}
                  </Text>
                </View>
              }
              rightSlot={<Unicons.UilLink size={20} color={getColor('neutral-500')} />}
              onPress={() => {
                dispatch(layoutActions.setShowItemModal(false));
                dispatch(layoutActions.setShowShareModal(true));
              }}
            />
          )}
        </View>

        <View style={tailwind('bg-white rounded-xl mt-4')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-red-60')}>{strings.components.file_and_folder_options.delete}</Text>
              </View>
            }
            rightSlot={<Unicons.UilTrash size={20} color={getColor('red-60')} />}
            onPress={() => {
              dispatch(layoutActions.setShowItemModal(false));
              dispatch(layoutActions.setShowDeleteModal(true));
            }}
          />
        </View>
      </View>
    </BottomModal>
  );
}

export default FileDetailsModal;
