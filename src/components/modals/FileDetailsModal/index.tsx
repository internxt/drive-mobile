import prettysize from 'prettysize';
import React from 'react';
import { Text, View, TouchableWithoutFeedback, Platform } from 'react-native';
import Modal from 'react-native-modalbox';
import * as Unicons from '@iconscout/react-native-unicons';

import strings from '../../../../assets/lang/strings';
import { getColor, tailwind } from '../../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global.style';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';

function FileDetailOption(props: {
  name: string | JSX.Element;
  onPress: () => void;
  icon: JSX.Element;
  lastItem?: boolean;
}): JSX.Element {
  return (
    <TouchableWithoutFeedback onPress={props.onPress}>
      <View
        style={[tailwind('flex-row items-center px-4 h-12 border-neutral-20'), !props.lastItem && tailwind('border-b')]}
      >
        <View style={tailwind('flex-grow')}>
          <Text>{props.name}</Text>
        </View>
        <View>{props.icon}</View>
      </View>
    </TouchableWithoutFeedback>
  );
}

function FileDetailsModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { focusedItem: item } = useAppSelector((state) => state.files);
  const { showItemModal } = useAppSelector((state) => state.layout);

  if (!item) {
    return <></>;
  }

  const isFolder = !item.fileId;
  const FileIcon = getFileTypeIcon(item?.type);

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={showItemModal}
      onClosed={async () => {
        dispatch(layoutActions.setShowItemModal(false));
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          onPress={() => {
            dispatch(layoutActions.setShowItemModal(false));
          }}
        >
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View>
          <View
            style={tailwind(
              'flex-row bg-white px-5 py-4 rounded-t-xl items-center justify-between border-b border-neutral-20',
            )}
          >
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

            <View>
              <TouchableWithoutFeedback
                onPress={() => {
                  dispatch(layoutActions.setShowItemModal(false));
                }}
              >
                <View style={tailwind('bg-neutral-20 rounded-full h-8 w-8 justify-center items-center ml-5')}>
                  <Unicons.UilTimes color={getColor('neutral-60')} size={24} />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>

          <View style={tailwind('bg-neutral-10 p-4 flex-grow')}>
            <View style={tailwind('rounded-xl bg-white')}>
              <FileDetailOption
                name={<Text style={tailwind('text-lg text-neutral-500')}>{strings.generic.rename}</Text>}
                icon={<Unicons.UilEditAlt size={20} color={getColor('neutral-500')} />}
                onPress={() => {
                  dispatch(layoutActions.setShowItemModal(false));
                  dispatch(layoutActions.setShowRenameModal(true));
                }}
              />

              {!isFolder && (
                <FileDetailOption
                  name={
                    <Text style={tailwind('text-lg text-neutral-500')}>
                      {strings.components.file_and_folder_options.share}
                    </Text>
                  }
                  icon={<Unicons.UilLink size={20} color={getColor('neutral-500')} />}
                  onPress={() => {
                    dispatch(layoutActions.setShowItemModal(false));
                    dispatch(layoutActions.setShowShareModal(true));
                  }}
                />
              )}
            </View>

            <View style={tailwind('bg-white rounded-xl mt-4')}>
              <FileDetailOption
                lastItem={true}
                name={
                  <Text style={tailwind('text-lg text-red-60')}>
                    {strings.components.file_and_folder_options.delete}
                  </Text>
                }
                icon={<Unicons.UilTrashAlt size={20} color={getColor('red-60')} />}
                onPress={() => {
                  dispatch(layoutActions.setShowItemModal(false));
                  dispatch(layoutActions.setShowDeleteModal(true));
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default FileDetailsModal;
