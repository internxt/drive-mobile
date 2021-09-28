import prettysize from 'prettysize';
import React from 'react'
import { Text, View, TouchableWithoutFeedback } from 'react-native'
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import strings from '../../../assets/lang/strings';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';
import { IFile, IFolder } from '../../components/FileList';
import { getColor, tailwind } from '../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../helpers';

interface FileDetailsProps extends Reducers {
  showItemModal: boolean
  folderContent: any
  item: IFile | IFolder
}

function FileDetailOption(props: {
  name: string | JSX.Element
  onPress: () => void
  icon: JSX.Element
  lastItem?: boolean
}): JSX.Element {
  return <TouchableWithoutFeedback
    onPress={props.onPress}>
    <View style={[tailwind('flex-row items-center px-4 h-12 border-neutral-20'), !props.lastItem && tailwind('border-b')]}>
      <View style={tailwind('flex-grow')}>
        <Text>{props.name}</Text>
      </View>
      <View>
        {props.icon}
      </View>
    </View>
  </TouchableWithoutFeedback>;
}

function FileDetailsModal(props: FileDetailsProps) {
  const { item } = props;

  if (!item) { return <></> }

  const isFolder = !item.fileId

  const FileIcon = getFileTypeIcon(item?.type)

  return <>
    {
      <Modal
        position={'bottom'}
        style={tailwind('bg-transparent')}
        coverScreen={true}
        isOpen={props.showItemModal}
        onClosed={async () => {
          props.dispatch(layoutActions.closeItemModal())
        }}
        backButtonClose={true}
        backdropPressToClose={true}
        animationDuration={200}
      >
        <View style={tailwind('h-full')}>
          <TouchableWithoutFeedback
            onPress={() => {
              props.dispatch(layoutActions.closeItemModal())
            }}
          >
            <View style={tailwind('flex-grow')} />
          </TouchableWithoutFeedback>

          <View>
            <View style={tailwind('flex-row bg-white px-4 py-3 rounded-t-xl items-center justify-between border-b border-neutral-20')}>
              <View style={tailwind('mr-2')}>
                {
                  isFolder
                    ?
                    <FolderIcon width={32} height={32} />
                    :
                    <FileIcon width={32} height={32} />
                }
              </View>

              <View style={tailwind('flex-shrink w-full')}>
                <Text numberOfLines={1} ellipsizeMode="middle">{item?.name}{item?.type ? '.' + item.type : ''}</Text>
                <Text style={tailwind('text-xs text-neutral-100')}>
                  {!isFolder && <>{prettysize(item?.size)} <Text style={tailwind('font-bold')}>·</Text></>}Updated {new Date(item?.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</Text>
              </View>

              <View>
                <TouchableWithoutFeedback onPress={() => {
                  props.dispatch(layoutActions.closeItemModal())
                }}>
                  <View style={tailwind('bg-neutral-20 rounded-full p-1 ml-6')}>
                    <Unicons.UilTimes color={'#B3BAC5'} size={25} />
                  </View>
                </TouchableWithoutFeedback>
              </View>

            </View>

            <View style={tailwind('bg-neutral-10 p-3 flex-grow pb-8')}>
              <View style={tailwind('rounded-xl bg-white')}>
                {/*
            <FileDetailOption
              name={strings.components.file_and_folder_options.move}
              icon={<Unicons.UilEdit size={16} color={getColor('neutral-500')} />}
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openMoveFilesModal());
              }}
            />
            */}

                <FileDetailOption
                  name={strings.generic.rename}
                  icon={<Unicons.UilEdit size={16} color={getColor('neutral-500')} />}
                  onPress={() => {
                    props.dispatch(layoutActions.closeItemModal());
                    props.dispatch(layoutActions.openRenameModal())
                  }}
                />

                {!isFolder && <FileDetailOption
                  name={strings.components.file_and_folder_options.share}
                  icon={<Unicons.UilLink size={16} color={getColor('neutral-500')} />}
                  onPress={() => {
                    props.dispatch(layoutActions.closeItemModal())
                    props.dispatch(layoutActions.openShareModal())
                  }}
                />}

              </View>

              <View style={tailwind('bg-red-10 rounded-xl mt-4')}>
                <FileDetailOption
                  lastItem={true}
                  name={<Text style={tailwind('text-red-60')}>{strings.components.file_and_folder_options.delete}</Text>}
                  icon={<Unicons.UilTrashAlt size={16} color={getColor('red-60')} />}
                  onPress={() => {
                    props.dispatch(layoutActions.closeItemModal());
                    props.dispatch(layoutActions.openDeleteModal())
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    }
  </>;
}

const mapStateToProps = (state: any) => {
  return {
    folderContent: state.filesState.folderContent,
    showItemModal: state.layoutState.showItemModal,
    item: state.filesState.focusedItem
  }
}

export default connect(mapStateToProps)(FileDetailsModal)