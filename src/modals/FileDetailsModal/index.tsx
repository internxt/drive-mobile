import prettysize from 'prettysize';
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, TouchableHighlight } from 'react-native'
import Modal from 'react-native-modalbox'
import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { fileActions, layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';

interface FileDetailsProps extends Reducers {
  showItemModal: boolean
  selectedItems: any[]
  folderContent: any
}

function FileDetailsModal(props: FileDetailsProps) {
  const [originalfilename, setOriginalFileName] = useState('')
  const [newfilename, setNewFileName] = useState('')

  const selectedItems = props.selectedItems
  const showModal = props.showItemModal && selectedItems.length > 0

  const file = selectedItems.length > 0 && selectedItems[0]
  const isFolder = file && !selectedItems[0].fileId
  const folder = isFolder && file

  useEffect(() => {
    if (props.showItemModal === true) {
      setOriginalFileName(file.name)
      setNewFileName(file.name)
    }
  }, [props.showItemModal])

  return <>
    {
      isFolder ?
        <Modal
          position={'bottom'}
          isOpen={showModal}
          swipeArea={100}
          swipeToClose={true}
          coverScreen={true}
          style={[styles.modal, styles.modalFolder]}
          onClosed={async () => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeItemModal())

            // OLD MODAL was a form to edit on the fly the file metadata. Now is just a simple modal with links.
            // The next code should be migrated to a new component.
            /*
            const metadata: IMetadata = {
              itemName: ''
            }

            if (newfilename !== originalfilename) {
              metadata.itemName = newfilename
            }

            if (Object.keys(metadata).length > 0) {
              await updateFolderMetadata(metadata, folder.id)

              props.dispatch(fileActions.getFolderContent(folder.parentId))
              if (newfilename !== originalfilename) {
                const userData = await getLyticsData()

                analytics.track('folder-rename', {
                  userId: userData.uuid,
                  email: userData.email,
                  platform: 'mobile',
                  device: Platform.OS,
                  // eslint-disable-next-line camelcase
                  folder_id: folder.id
                }).catch(() => { })
              }
            }
            */
          }}
          backButtonClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <Text
            numberOfLines={1}
            ellipsizeMode={'tail'}
            style={styles.folderName}
          >{file.name}</Text>

          <Separator />

          <View>
            <TouchableHighlight
              underlayColor={'#eee'}
              onPress={() => {
                // props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openRenameModal())
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingLeft: 20 }}>
                <View style={{ paddingRight: 10 }}>
                  <Unicons.UilEdit color="#0F62FE" size={30} />
                </View>
                <View>
                  <Text style={{ fontFamily: 'NeueEinstellung-Regular' }}>{strings.generic.rename}</Text>
                </View>

              </View>
            </TouchableHighlight>
          </View>

          <View>
            <TouchableHighlight
              underlayColor={'#eee'}
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openDeleteModal())
              }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingLeft: 20 }}>
                <View style={{ paddingRight: 10 }}>
                  <Unicons.UilTrashAlt color="#DA1E28" size={30} />
                </View>
                <View>
                  <Text style={{ fontFamily: 'NeueEinstellung-Regular', color: '#DA1E28' }}>{strings.generic.delete}</Text>
                </View>
              </View>
            </TouchableHighlight>
          </View>

          <Separator />

          <View>
            <TouchableHighlight
              underlayColor={'#eee'}
              style={{
                alignItems: 'center',
                padding: 20
              }}
              onPress={() => {
                props.dispatch(fileActions.deselectAll())
                props.dispatch(layoutActions.closeItemModal())
              }}>
              <Text style={{ color: '#DA1E28' }}>{strings.generic.cancel}</Text>
            </TouchableHighlight>
          </View>

        </Modal>
        :
        <Modal
          position={'bottom'}
          swipeArea={20}
          style={[styles.modal, styles.modalSettingsFile]}
          coverScreen={true}
          isOpen={showModal}
          onClosed={async () => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeItemModal())

            /*
            const metadata: IMetadata = {
              itemName: ''
            }

            if (newfilename !== originalfilename) {
              metadata.itemName = newfilename
              await updateFileMetadata(metadata, file.fileId)
              props.dispatch(fileActions.getFolderContent(props.folderContent.currentFolder))
              const userData = await getLyticsData()

              analytics.track('file-rename', {
                userId: userData.uuid,
                email: userData.email,
                platform: 'mobile',
                device: Platform.OS,
                // eslint-disable-next-line camelcase
                folder_id: file.id
              }).catch(() => { })
            }
            */
          }}
          backButtonClose={true}
          backdropPressToClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <View
            style={styles.fileName}
          >
            <Text style={{ fontSize: 15, textAlign: 'center', margin: 10 }}>{newfilename}{file && file.type ? '.' + file.type : ''}</Text>
          </View>

          <Separator />

          <View style={styles.infoContainer}>
            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.type}</Text>
              <Text style={styles.cerebriSansBold}>
                {file && file.type ? file.type.toUpperCase() : ''}
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.added}</Text>
              <Text style={styles.cerebriSansBold}>
                <TimeAgo time={file.created_at} />
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>{strings.components.file_and_folder_options.size}</Text>
              <Text style={styles.cerebriSansBold}>
                {file ? prettysize(file.size) : ''}
              </Text>
            </Text>
          </View>

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

            <SettingsItem
              text={<View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ margin: 10 }}>
                  <Unicons.UilShare color="#0F62FE" />
                </View>
                <Text style={{}}>{strings.components.file_and_folder_options.share}</Text>
              </View>}
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openShareModal())
              }}
            />

            <SettingsItem
              text={<View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ margin: 10 }}>
                  <Unicons.UilTrashAlt color="#DA1E28" />
                </View>

                <Text style={styles.cerebriSansBold}>{strings.components.file_and_folder_options.delete}</Text>
              </View>}
              onPress={() => {
                props.dispatch(layoutActions.openDeleteModal())
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
    selectedItems: state.filesState.selectedItems
  }
}

export default connect(mapStateToProps)(FileDetailsModal)

const styles = StyleSheet.create({
  cerebriSansBold: {
    fontFamily: 'NeueEinstellung-Regular'
  },
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#0F62FE',
    borderRadius: 4,
    height: 4,
    margin: 12,
    width: 50
  },
  fileName: {
    width: wp(92),
    alignSelf: 'center',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 20,
    padding: 0 // remove default padding on Android
  },
  folderName: {
    fontFamily: 'NeueEinstellung-Bold',
    textAlign: 'center',
    fontSize: 20,
    marginLeft: 20,
    marginRight: 20,
    padding: 0 // Remove default padding Android
  },
  infoContainer: {
    height: 'auto'
  },
  modal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  },
  modalFolder: {
    height: hp('90%') < 550 ? 550 : Math.min(380, hp('90%')),
    marginTop: wp('12')
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
  }
})