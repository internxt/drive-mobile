import React from 'react';
import { View, Text, TouchableHighlight } from 'react-native';
import prettysize from 'prettysize';

import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveThunks } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import BottomModal from '../BottomModal';
import AppText from '../../AppText';
import { items } from '@internxt/lib';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import { time } from '@internxt-mobile/services/common/time';

function DeleteItemModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { focusedItem: item } = useAppSelector((state) => state.drive);
  const { showDeleteModal } = useAppSelector((state) => state.ui);
  const isFolder = item && !item.fileId;
  const FileIcon = getFileTypeIcon(item?.type || '');
  const onDeleteButtonPressed = () => {
    dispatch(driveThunks.deleteItemsThunk({ items: [item] }));
    dispatch(uiActions.setShowDeleteModal(false));
  };

  const getUpdatedAt = () => {
    if (item) {
      return time.getFormattedDate(item.updatedAt, time.formats.dateAtTime);
    }
  };
  return (
    <BottomModal
      isOpen={showDeleteModal}
      onClosed={() => {
        dispatch(uiActions.setShowDeleteModal(false));
      }}
    >
      <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
        <View style={tailwind('h-1 w-20 bg-neutral-30 rounded-full')} />
      </View>

      <View style={tailwind('bg-white justify-center py-3')}>
        <AppText style={[tailwind('text-center text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>
          {strings.modals.delete_modal.title}
        </AppText>
        <Text style={tailwind('text-center text-sm text-neutral-100')}>{strings.modals.delete_modal.warning}</Text>

        <View style={tailwind('items-center my-8')}>
          {isFolder ? <FolderIcon width={80} height={80} /> : <FileIcon width={80} height={80} />}
          <AppText
            style={[tailwind('text-base text-neutral-500 mt-3 px-10'), globalStyle.fontWeight.medium]}
            numberOfLines={1}
            ellipsizeMode={'middle'}
          >
            {item && items.getItemDisplayName(item)}
          </AppText>

          <View style={tailwind('flex flex-row items-center')}>
            <AppText style={tailwind('text-xs text-gray-60')}>
              {!isFolder && <>{prettysize(item?.size || 0)}</>}
            </AppText>
            {!isFolder && <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />}
            <AppText style={tailwind('text-xs text-gray-60')}>{getUpdatedAt()}</AppText>
          </View>
        </View>
      </View>

      <View style={tailwind('flex-row justify-between bg-white p-3')}>
        <TouchableHighlight
          underlayColor={getColor('text-neutral-30')}
          style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
          onPress={() => {
            dispatch(uiActions.setShowDeleteModal(false));
          }}
        >
          <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>
            {strings.buttons.cancel}
          </Text>
        </TouchableHighlight>

        <View style={tailwind('px-1')}></View>

        <TouchableHighlight
          underlayColor={getColor('text-red-70')}
          style={tailwind('bg-red-60 rounded-lg py-2 flex-grow items-center justify-center')}
          onPress={onDeleteButtonPressed}
        >
          <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>{strings.buttons.delete}</Text>
        </TouchableHighlight>
      </View>
    </BottomModal>
  );
}

export default DeleteItemModal;
