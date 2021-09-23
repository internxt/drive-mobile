import prettysize from 'prettysize';
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Modal from 'react-native-modalbox'
import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';
import { IFile, IFolder } from '../../components/FileList';

interface FileDetailsProps extends Reducers {
  showItemModal: boolean
  folderContent: any
  item: IFile | IFolder
}

function FileDetailsModal(props: FileDetailsProps) {
  const { item } = props;

  if (!item)
  {return <></>}

  const isFolder = !item.fileId

  return <>
    {
      <Modal
        position={'bottom'}
        swipeArea={20}
        style={[styles.modal, styles.modalSettingsFile]}
        coverScreen={true}
        isOpen={props.showItemModal}
        onClosed={async () => {
          props.dispatch(layoutActions.closeItemModal())
        }}
        backButtonClose={true}
        backdropPressToClose={true}
        animationDuration={200}
      >
        <View style={styles.drawerKnob}></View>

        <View
          style={styles.fileName}
        >
          <Text style={styles.fileName}>{item.name}{item && item.type ? '.' + item.type : ''}</Text>
        </View>

        {isFolder ? <></> : <View>
          <Separator />

          <View style={styles.infoContainer}>
            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.type}</Text>
              <Text style={styles.cerebriSansBold}>
                {item && item.type ? item.type.toUpperCase() : ''}
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.added}</Text>
              <Text style={styles.cerebriSansBold}>
                <TimeAgo time={item.createdAt} />
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.size}</Text>
              <Text style={styles.cerebriSansBold}>
                {item ? prettysize(item.size) : ''}
              </Text>
            </Text>
          </View>
        </View>
        }
        <Separator />

        <View style={styles.optionsContainer}>
          {/*
            <SettingsItem
              text={
                <Text>
                  <Image source={getIcon('move')} style={styles.w2020} />
                  <Text style={styles.mr20}> </Text>
                  <Text style={styles.cerebriSansBold}> {strings.components.file_and_folder_options.move}</Text>
                </Text>
              }
              onPress={() => {
                props.dispatch(layoutActions.openMoveFilesModal());
              }}
            />
            */}
          {isFolder? <></> :
            <SettingsItem
              text={strings.components.file_and_folder_options.share}
              icon={Unicons.UilShare}
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openShareModal())
              }}
            />
          }
          <SettingsItem
            text={strings.generic.rename}
            icon={Unicons.UilEdit}
            onPress={() => {
              props.dispatch(layoutActions.closeItemModal());
              props.dispatch(layoutActions.openRenameModal())
            }}
          />

          <SettingsItem
            text={strings.components.file_and_folder_options.delete}
            icon={Unicons.UilTrashAlt}
            color={'#DA1E28'}
            onPress={() => {
              props.dispatch(layoutActions.closeItemModal());
              props.dispatch(layoutActions.openDeleteModal())
            }}
          />
        </View>
        <Separator />
        <View style={styles.cancelContainer}>
          <SettingsItem
            text={<Text style={styles.cancelText}>{strings.generic.cancel}</Text>}
            onPress={() => {
              props.dispatch(layoutActions.closeItemModal());
            }}
          />
        </View>
      </Modal>}
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

const styles = StyleSheet.create({
  cerebriSansBold: {
    fontFamily: 'NeueEinstellung-Regular'
  },
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#EBECF0',
    borderRadius: 4,
    height: 4,
    margin: 12,
    width: 50
  },
  fileName: {
    width: wp(92),
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
    padding: 0, // remove default padding on Android
    fontWeight: 'bold',
    color: '#42526E'
  },
  infoContainer: {
    height: 'auto'
  },
  modal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  },
  modalSettingsFile: {
    height: 'auto'
  },
  optionsContainer: {
    marginBottom: 15
  },
  textDefault: {
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 15,
    fontWeight: 'bold',
    paddingBottom: 6,
    paddingLeft: 24
  },
  cancelText: {
    color: '#f00',
    textAlign: 'center',
    flexGrow: 1,
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 19,
    fontWeight: '500'
  },
  cancelContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    flexGrow: 1,
    marginBottom: 16
  }
})