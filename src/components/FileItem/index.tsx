import React, { SetStateAction, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import IconFolder from '../IconFolder';
import TimeAgo from 'react-native-timeago';
import Icon from '../../../assets/icons/Icon';
import IconFile from '../IconFile';
import { fileActions, layoutActions } from '../../redux/actions';
import RNFetchBlob from 'rn-fetch-blob'
import { deviceStorage, getLyticsData } from '../../helpers';
import FileViewer from 'react-native-file-viewer'
import { colors } from '../../redux/constants';
import analytics from '../../helpers/lytics';
import { IFile, IFolder, IUploadingFile } from '../FileList';
import { Reducers } from '../../redux/reducers/reducers';
import * as FileSystem from 'expo-file-system'

import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
interface FileItemProps extends Reducers {
  isFolder: boolean
  item: IFile & IFolder | IUploadingFile
  dispatch?: any
  isLoading?: boolean
}

async function handleClick(props: FileItemProps, setProgress: React.Dispatch<SetStateAction<number>>) {
  const isSelectionMode = props.filesState.selectedItems.length > 0

  if (isSelectionMode) {
    // one tap will select file if there are already selected files
    const isSelected = props.filesState.selectedItems.filter((x: (IFile & IFolder)) => x.id === props.item.id).length > 0

    return handleLongPress(props, isSelected)
  }

  // one tap on a folder will open and load contents
  if (props.isFolder) {
    const userData = await getLyticsData()

    analytics.track('folder-opened', {
      userId: userData.uuid,
      email: userData.email,
      folder_id: props.item.id
    })
    props.dispatch(fileActions.getFolderContent(props.item.id.toString()))

  } else {
    // one tap on a file will download and preview the file

    // if the file is still uploading, do not do anything
    if (props.isLoading && !props.filesState.uploadFileUri) {
      return
    }

    // once it stopped uploading
    if (props.filesState.uploadFileUri) {
      const fileInfo = await FileSystem.getInfoAsync(props.filesState.uploadFileUri)

      if (fileInfo.exists) {
        FileViewer.open(fileInfo.uri).catch(() => {})
        return
      }
    }

    // Dispatch file download start
    props.dispatch(fileActions.downloadSelectedFileStart())

    try {
      const userData = await getLyticsData()

      analytics.track('file-download-start', {
        file_id: props.item.id,
        file_size: props.item.size,
        file_type: props.item.type,
        email: userData.email,
        folder_id: props.item.folderId,
        platform: 'mobile'
      })
    } catch (error) {}

    const xToken = await deviceStorage.getItem('xToken')
    const xUser = await deviceStorage.getItem('xUser')
    const xUserJson = JSON.parse(xUser || '{}')

    return RNFetchBlob.config({
      appendExt: props.item.type,
      path: RNFetchBlob.fs.dirs.DocumentDir + '/' + props.item.name + '.' + props.item.type,
      fileCache: true
    }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/storage/file/${props.item.fileId}`, {
      'Authorization': `Bearer ${xToken}`,
      'internxt-mnemonic': xUserJson.mnemonic
    }).progress((received) => {
      setProgress(received)
    }).then(async (res) => {
      if (res.respInfo.status === 200) {
        FileViewer.open(res.path()).catch(err => {
          Alert.alert('Error opening file', err.message)
        })
      } else {
        Alert.alert('Error downloading file')
      }

      try {
        const userData = await getLyticsData()

        analytics.track('file-download-finished', {
          file_id: props.item.id,
          file_size: props.item.size,
          file_type: props.item.type,
          email: userData.email,
          folder_id: props.item.folderId,
          platform: 'mobile'
        })
      } catch (error) {}

    }).catch(async err => {
      try {
        const userData = await getLyticsData()

        analytics.track('file-download-error', {
          file_id: props.item.id,
          file_size: props.item.size,
          file_type: props.item.type,
          email: userData.email,
          folder_id: props.item.folderId,
          platform: 'mobile',
          msg: err && err.message
        })
      } catch (error) {}

    }).finally(() => {
      // Dispatch download file end
      props.dispatch(fileActions.downloadSelectedFileStop())
    })
  }
}

async function handleLongPress(props: FileItemProps, isSelected: boolean) {
  if (isSelected) {
    props.dispatch(fileActions.deselectFile(props.item))
  } else {
    props.dispatch(fileActions.selectFile(props.item))
  }
}

function FileItem(props: FileItemProps) {
  const isSelectionMode = props.filesState.selectedItems.length > 0
  const isSelected = props.filesState.selectedItems.filter((x: any) => x.id === props.item.id).length > 0

  const [progress, setProgress] = useState(0)
  const progressPct = progress > 0 ? progress / props.item.size : 0
  const progressWidth = 40 * progressPct

  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadProgressWidth = 40 * uploadProgress

  const [isLoading, setIsLoading] = useState(props.isLoading ? true : false)

  const extendStyles = StyleSheet.create({
    text: { color: '#000000' },
    containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' }
  });

  useEffect(() => {
    setUploadProgress(props.item.progress)
  }, [props.item.progress])

  const item = props.item

  return (
    <View>
      <View style={[styles.container, extendStyles.containerBackground]}>
        <View style={styles.mainContainer}>
          <View style={styles.fileDetails}>
            <TouchableOpacity
              style={styles.touchableItemArea}
              onLongPress={() => { handleLongPress(props, isSelected) }}
              onPress={() => {
                setIsLoading(true)
                handleClick(props, setProgress).finally(() => {
                  setProgress(0)
                  setIsLoading(false)
                })
              }}>

              <View style={styles.itemIcon}>
                {
                  props.isFolder ?
                    <View>
                      <IconFolder color={props.item.color} />
                      {
                        props.isFolder && props.item.icon ?

                          <View style={styles.iconContainer}>
                            <Icon
                              name={props.item.icon.name}
                              color={item.color ? colors[item.color].icon : colors['blue'].icon}
                              width={24}
                              height={24}
                            />
                          </View>
                          :
                          null
                      }
                    </View>
                    : // once local upload implelemented, remove conditional
                    <IconFile label={props.item.bucket ? props.item.type || '' : props.item.name && props.item.name.split('.').pop()} isLoading={isLoading} />
                }
              </View>

              <View style={styles.nameAndTime}>
                <Text
                  style={[styles.fileName, extendStyles.text]}
                  numberOfLines={1} // once local upload implemented, remove conditional
                >{props.item.bucket ? props.item.name : props.item.name && props.item.name.split('.').shift()}</Text>

                {!props.isFolder && <TimeAgo time={props.item.createdAt} />}
              </View>
            </TouchableOpacity>
          </View>

          {
            props.item.bucket ?
              <View style={styles.buttonDetails}>
                <TouchableOpacity
                  style={isSelectionMode ? styles.dNone : styles.dFlex}
                  onPress={() => {
                    props.dispatch(layoutActions.openItemModal(props.item))
                  }}>
                  <Icon name="details" />
                </TouchableOpacity>
              </View>
              :
              null
          }
        </View>

        <View style={styles.progressIndicatorContainer}>
          {
            progressWidth ?
              <LinearGradient
                colors={['#00b1ff', '#096dff']}
                start={[0, 0.7]}
                end={[0.7, 1]}
                style={[styles.progressIndicator, { width: progressWidth }]} />
              :
              null
          }

          {
            props.isLoading ?
              <LinearGradient
                colors={['#00b1ff', '#096dff']}
                start={[0, 0.7]}
                end={[0.7, 1]}
                style={[styles.progressIndicator, { width: uploadProgressWidth }]} />
              :
              null
          }
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  progressIndicatorContainer: {
    position: 'absolute',
    top: 65,
    width: 40,
    height: 3,
    marginLeft: wp('6.7')
  },
  progressIndicator: {
    backgroundColor: '#87B7FF',
    height: 3,
    opacity: 0.6,
    borderRadius: 3,
    marginBottom: 7
  },
  container: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderColor: '#e6e6e6'
  },
  mainContainer: {
    height: 75,
    flexDirection: 'row',
    alignItems: 'center'
  },
  fileDetails: {
    flexGrow: 1
  },
  touchableItemArea: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  itemIcon: {
  },
  nameAndTime: {
    flexDirection: 'column',
    width: '56%'
  },
  fileName: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 16,
    letterSpacing: -0.1,
    color: '#000000'
  },
  buttonDetails: {
    borderRadius: 30,
    width: 51,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dFlex: {
    display: 'flex'
  },
  dNone: {
    display: 'none'
  },
  iconContainer: {
    position: 'absolute', left: 35, top: 7
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileItem);