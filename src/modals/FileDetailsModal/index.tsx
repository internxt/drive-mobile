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
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { colors, folderIconsList } from '../../redux/constants'
import { updateFileMetadata, updateFolderMetadata } from './actions';
import analytics, { getLyticsData } from '../../helpers/lytics';
import strings from '../../../assets/lang/strings';

interface FileDetailsProps {
  dispatch?: any
  showItemModal: boolean
  selectedItems: any[]
  folderContent: any
}

function FileDetailsModal(props: FileDetailsProps) {
  const [originalfilename, setOriginalFileName] = useState('')
  const [newfilename, setNewFileName] = useState('')

  const [selectedColor, setSelectedColor] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(0)

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

          <TextInput
            style={styles.folderName}
            onChangeText={value => {
              setNewFileName(value)
            }}
            value={newfilename}
          />

          <Separator />

          <Text style={styles.stylesColorFolder}>
            {strings.components.file_and_folder_options.styling}
          </Text>

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

          <Text style={styles.stylesCoverFolder}>{strings.components.file_and_folder_options.icons}</Text>

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
              props.dispatch(fileActions.getFolderContent(props.folderContent.currentFolder))
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

          <TextInput
            style={styles.fileName}
            onChangeText={value => setNewFileName(value)}
            value={newfilename}
          />

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
                {file ? <TimeAgo time={file.created_at} /> : ''}
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
            <SettingsItem
              text={
                <Text style={styles.modalFileItemContainer}>
                  <Image source={getIcon('move')} style={{ width: 20, height: 20 }} />
                  <Text style={styles.mr20}> </Text>
                  <Text style={styles.cerebriSansBold}> {strings.components.file_and_folder_options.move}</Text>
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
                  <Text style={{}}> {strings.components.file_and_folder_options.share}</Text>
                </Text>
              }
              onPress={() => {
                props.dispatch(layoutActions.closeItemModal())
                props.dispatch(layoutActions.openShareModal())
              }}
            />

            <SettingsItem
              text={
                <Text style={styles.modalFileItemContainer}>
                  <Image source={getIcon('delete')} style={{ width: 16, height: 21 }} />
                  <Text style={styles.mr20}> </Text>
                  <Text style={styles.cerebriSansBold}>  {strings.components.file_and_folder_options.delete}</Text>
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
  return { 
    folderContent: state.filesState.folderContent,
    showItemModal: state.layoutState.showItemModal,
    selectedItems: state.filesState.selectedItems
  }
}

export default connect(mapStateToProps)(FileDetailsModal)

const styles = StyleSheet.create({
  cerebriSansBold: {
    fontFamily: 'CerebriSans-Bold'
  },
  colorButton: {
    alignItems: 'center',
    borderRadius: 15,
    height: 27,
    justifyContent: 'center',
    marginLeft: 9,
    marginRight: 9,
    width: 27
  },
  colorSelection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
    marginRight: 15
  },
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#d8d8d8',
    borderRadius: 4,
    height: 7,
    marginBottom: 10,
    marginTop: 10,
    width: 56
  },
  fileName: {
    width: wp(92),
    alignSelf: 'center',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 20,
    padding: 0 // remove default padding on Android
  },
  folderName: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 20,
    marginLeft: 26,
    padding: 0 // Remove default padding Android
  },
  iconButton: {
    alignItems: 'center',
    height: 43,
    justifyContent: 'center',
    margin: hp('90%') < 600 ? 5 : 8,
    width: 43
  },
  iconImage: {
    height: 25,
    width: 25
  },
  iconSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 15
  },
  infoContainer: {
    height: 'auto'
  },
  modalFileItemContainer: {
  },
  modalFolder: {
    height: hp('90%') < 550 ? 550 : Math.min(600, hp('90%')),
    marginTop: wp('12')
  },
  modalSettingsFile: {
    height: 'auto'
  },
  mr20: {
    marginRight: 20
  },
  optionsContainer: {
    marginBottom: 15
  },
  stylesColorFolder: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 17,
    fontWeight: 'bold',
    paddingBottom: 8,
    paddingLeft: 24
  },
  stylesCoverFolder: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 17,
    fontWeight: 'bold',
    paddingBottom: 5,
    paddingLeft: 24
  },
  textDefault: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 18,
    fontWeight: 'bold',
    paddingBottom: 6,
    paddingLeft: 24
  }
})