import prettysize from 'prettysize';
import React, { useEffect, useState } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';
import Icon from '../../../assets/icons/Icon';
import Separator from '../../components/Separator';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import SettingsItem from '../SettingsModal/SettingsItem';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { colors, folderIconsList } from '../../redux/constants'
import { updateFileMetadata, updateFolderMetadata } from './actions';
import analytics, { getLyticsData } from '../../helpers/lytics';

interface FileDetailsProps {
  dispatch?: any
  filesState?: any
  layoutState?: any
}

function FileDetailsModal(props: FileDetailsProps) {
  const [originalfilename, setOriginalFileName] = useState('')
  const [newfilename, setNewFileName] = useState('')

  const [selectedColor, setSelectedColor] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(0)

  const selectedItems = props.filesState.selectedItems
  const showModal = props.layoutState.showItemModal && selectedItems.length > 0

  const file = selectedItems.length > 0 && selectedItems[0]
  const isFolder = file && !selectedItems[0].fileId
  const folder = isFolder && file

  useEffect(() => {
    if (props.layoutState.showItemModal === true) {
      setOriginalFileName(file.name)
      setNewFileName(file.name)
    }
  }, [props.layoutState.showItemModal])

  return <>
    {
      isFolder ?
        <Modal
          position={'bottom'}
          swipeArea={20}
          isOpen={showModal}
          style={styles.modalFolder}
          onClosed={async () => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeItemModal())

            const metadata: any = {}

            if (newfilename !== originalfilename) {
              metadata.itemName = newfilename
            }

            if (selectedColor && selectedColor !== folder.color) {
              analytics.track('folder-color-selection', { value: selectedColor }).catch(() => { })
              metadata.color = selectedColor
            }

            if (selectedIcon && selectedIcon > 0) {
              if (folder.icon && folder.icon.id !== selectedIcon) {
                analytics.track('folder-icon-selection', { value: selectedIcon }).catch(() => { })
                metadata.icon = selectedIcon
              }
              else if (!folder.icon) {
                metadata.icon = selectedIcon
              }
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
                  folder_id: folder.id
                }).catch(() => { })
              }
            }
          }}
          backButtonClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <View style={{ flexDirection: 'row', paddingRight: 22 }}>
            <TextInput
              style={styles.textDefault}
              onChangeText={value => {
                setNewFileName(value)
              }}
              value={newfilename}
            />
          </View>
          <Separator />

          <Text
            style={styles.styleColor}>Style Color</Text>
          <View style={styles.colorSelection}>
            {Object.getOwnPropertyNames(colors).map((value, i) => {
              const localColor = selectedColor ? selectedColor : (folder ? folder.color : null);
              const isSelected = localColor ? localColor === value : false;

              return (
                <TouchableHighlight
                  key={i}
                  underlayColor={colors[value].darker}
                  style={[{ backgroundColor: colors[value].code }, styles.colorButton]}
                  onPress={() => setSelectedColor(value)}
                >
                  {isSelected ? (
                    <Icon name="checkmark" width={15} height={15} />
                  ) : <></>}
                </TouchableHighlight>
              );
            })}
          </View>

          <Separator />

          <Text
            style={styles.textDefault}>Cover Icon</Text>

          <View style={styles.iconSelection} key={selectedIcon}>
            {folderIconsList.map((value, i) => {
              const localIcon = typeof selectedIcon === 'number' && selectedIcon >= 0 ?
                selectedIcon : folder && folder.icon ? folder.icon.id
                  : null;
              const isSelected = localIcon ? localIcon - 1 === i : false;
              const iconValue = isSelected ? 0 : i + 1;

              return (
                <TouchableHighlight
                  key={i}
                  style={styles.iconButton}
                  underlayColor="#F2F5FF"
                  onPress={() => setSelectedIcon(iconValue)}
                >
                  <Icon
                    name={value}
                    color={isSelected ? '#4385F4' : 'grey'}
                    width={30}
                    height={30}
                    style={styles.iconImage}
                  />
                </TouchableHighlight>
              );
            })}
          </View>
        </Modal>
        :
        <Modal
          position={'bottom'}
          swipeArea={20}
          style={styles.modalSettingsFile}
          isOpen={showModal}
          onClosed={async () => {
            props.dispatch(fileActions.deselectAll())
            props.dispatch(layoutActions.closeItemModal())

            const metadata: any = {}

            if (newfilename !== originalfilename) {
              metadata.itemName = newfilename
              await updateFileMetadata(metadata, file.fileId)
              props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.currentFolder))
              const userData = await getLyticsData()

              analytics.track('file-rename', {
                userId: userData.uuid,
                email: userData.email,
                platform: 'mobile',
                device: Platform.OS,
                folder_id: file.id
              }).catch(() => { })
            }
          }}
          backButtonClose={true}
          backdropPressToClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <View style={styles.fileNameContainer}>
            <TextInput
              style={styles.fileName}
              onChangeText={value => setNewFileName(value)}
              value={newfilename}
            />
          </View>

          <Separator />

          <View style={styles.infoContainer}>
            <Text style={styles.textDefault}>
              <Text>Type: </Text>
              <Text style={styles.cerebriSansBold}>
                {file && file.type ? file.type.toUpperCase() : ''}
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>Added: </Text>
              <Text style={styles.cerebriSansBold}>
                {file ? <TimeAgo time={file.created_at} /> : ''}
              </Text>
            </Text>

            <Text style={styles.textDefault}>
              <Text>Size: </Text>
              <Text style={styles.cerebriSansBold}>
                {file ? prettysize(file.size) : ''}
              </Text>
            </Text>
          </View>

          <Separator />

          <View style={styles.optionsContainer}>
            <SettingsItem
              text={
                <Text style={styles.modalFileItemContainer}>
                  <Image source={getIcon('move')} style={{ width: 20, height: 20 }} />
                  <Text style={styles.mr20}> </Text>
                  <Text style={styles.cerebriSansBold}> Move</Text>
                </Text>
              }
              onPress={() => {
                props.dispatch(layoutActions.openMoveFilesModal());
              }}
            />

            <SettingsItem
              text={
                <Text style={styles.modalFileItemContainer}>
                  <Image source={getIcon('share')} style={{ width: 20, height: 14 }} />
                  <Text style={styles.mr20}> </Text>
                  <Text style={{}}> Share</Text>
                </Text>
              }
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openShareModal())
              }}
            />

            <SettingsItem text={
              <Text style={styles.modalFileItemContainer}>
                <Image source={getIcon('delete')} style={{ width: 16, height: 21 }} />
                <Text style={styles.mr20}> </Text>
                <Text style={styles.cerebriSansBold}> Delete</Text>
              </Text>
            }
            onPress={() => {
              props.dispatch(layoutActions.openDeleteModal())
            }}
            />
          </View>
        </Modal>}
  </>;
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileDetailsModal)

const styles = StyleSheet.create({
  modalSettingsFile: {
    height: Platform.OS === 'ios' ? '42%' : '55%'
  },
  modalFileItemContainer: {
  },
  drawerKnob: {
    backgroundColor: '#d8d8d8',
    width: 56,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10
  },
  modalFolder: {
    height: hp('90%') < 550 ? 550 : Math.min(600, hp('90%')),
    marginTop: 70
  },
  colorSelection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
    marginRight: 15
  },
  colorButton: {
    height: 27,
    width: 27,
    borderRadius: 15,
    marginLeft: 9,
    marginRight: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconSelection: {
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
    marginRight: 15
  },
  iconButton: {
    height: 43,
    width: 43,
    margin: hp('90%') < 600 ? 5 : 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconImage: {
    height: 25,
    width: 25
  },
  fileNameContainer: {
    height: 'auto'
  },
  fileName: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 20,
    marginLeft: 26
  },
  infoContainer: {
    height: 'auto'
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 15,
    minHeight: 129 // pixel perfect leave like this
  },
  textDefault: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 15,
    paddingLeft: 24,
    paddingBottom: 6,
    fontWeight: 'bold'
  },
  cerebriSansBold: {
    fontFamily: 'CerebriSans-Bold'
  },
  styleColor: {
    fontFamily: 'CerebriSans-Bold',
    fontWeight: 'bold',
    paddingLeft: 24,
    paddingBottom: 6
  },
  mr20: {
    marginRight: 20
  }
})