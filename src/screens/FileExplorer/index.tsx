import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, Platform, Alert, BackHandler } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { fileActions, userActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList from '../../components/FileList';
import SettingsModal, { loadValues } from '../../modals/SettingsModal';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
import FileDetailsModal from '../../modals/FileDetailsModal';
import SortModal from '../../modals/SortModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import { Reducers } from '../../redux/reducers/reducers';
import analytics, { getLyticsData } from '../../helpers/lytics';
import RNFetchBlob from 'rn-fetch-blob';
import { WaveIndicator } from 'react-native-indicators'
import Toast from 'react-native-simple-toast'
import FreeForYouModal from '../../modals/FreeForYouModal';
import strings from '../../../assets/lang/strings';

interface FileExplorerProps extends Reducers {
  navigation?: any
  filesState: any
  dispatch?: any,
  layoutState: any
  authenticationState: any
}

function FileExplorer(props: FileExplorerProps): JSX.Element {
  const [selectedKeyId, setSelectedKeyId] = useState(0)
  const { filesState } = props
  const parentFolderId = (() => {
    if (filesState.folderContent) {
      return filesState.folderContent.parentId || null
    } else {
      return null
    }
  })()
  let count = 0
  // Check if everything is set up for file upload
  const validateUri = () => {
    if (Platform.OS === 'ios') {
      return filesState.uri && filesState.folderContent && filesState.folderContent.currentFolder

    } else {
      return filesState.uri.fileUri && filesState.folderContent && filesState.folderContent.currentFolder
    }
  }

  useEffect(() => {
    getLyticsData().then(userData => {
      loadValues().then(res => {
        const currentPlan = {
          usage: parseInt(res.usage.toFixed(1)),
          limit: parseInt(res.limit.toFixed(1)),
          percentage: parseInt((res.usage / res.limit).toFixed(1))
        }

        props.dispatch(userActions.setUserStorage(currentPlan))
        try {
          if (res) {
            analytics.identify(userData.uuid, {
              userId: userData.uuid,
              email: userData.email,
              platform: 'mobile',
              storage_used: currentPlan.usage,
              storage_limit: currentPlan.limit,
              storage_usage: currentPlan.percentage
            }).catch(() => {})
          }
        } catch {}
      })
    }).catch(() => {})
  }, [])

  // useEffect to trigger uploadFile while app on background
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri
        const name = filesState.uri.split('/').pop()

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder)
        }, 3000)
      }
    } else {
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri.fileUri
        const name = filesState.uri.fileName.split('/').pop()

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder)
        }, 3000)
      }
    }
  }, [filesState.uri])

  // seEffect to trigger uploadFile while app closed
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (validateUri()) {
        const uri = filesState.uri
        const name = filesState.uri.split('/').pop()

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder)
        }, 3000)
      }
    } else {
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri.fileUri
        const name = filesState.uri.fileName

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder)
        }, 3000)
      }
    }

    // Set rootfoldercontent for MoveFilesModal
    parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(filesState.folderContent)) : null

    // BackHandler
    const backAction = () => {
      if (props.filesState.folderContent && !props.filesState.folderContent.parentId) {
        count++
        if (count < 2) {
          Toast.show('Try exiting again to close the app')
        } else {
          BackHandler.exitApp()
        }

        // Reset if some time passes
        setTimeout(() => {
          count = 0
        }, 4000)
      } else {
        props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.parentId))
      }
      return true
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)

    return () => backHandler.remove()
  }, [filesState.folderContent])

  const uploadFile = async (uri: string, name: string, currentFolder: number) => {
    props.dispatch(fileActions.setUri(undefined))
    const userData = await getLyticsData()

    try {
      const token = props.authenticationState.token;
      const mnemonic = props.authenticationState.user.mnemonic;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data'
      }
      const regex = /^(.*:\/{0,2})\/?(.*)$/gm

      analytics.track('file-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => {})
      props.dispatch(fileActions.uploadFileStart(name))

      const file = uri.replace(regex, '$2') // if iOS remove file://
      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(uri)

      RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${currentFolder}/upload`, headers,
        [
          { name: 'xfile', filename: name, data: finalUri }
        ])
        .uploadProgress({ count: 10 }, (sent, total) => {
          props.dispatch(fileActions.uploadFileSetProgress(sent / total))

        })
        .then((res) => {
          if (res.respInfo.status === 401) {
            throw res;
          }
          const data = res

          return data
        })
        .then(res => {
          if (res.respInfo.status === 402) {
            props.navigation.replace('OutOfSpace')

          } else if (res.respInfo.status === 201) {
            analytics.track('file-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
            props.dispatch(fileActions.getFolderContent(filesState.folderContent.currentFolder))

          } else {
            Alert.alert('Error', 'Can not upload file');
          }

          props.dispatch(fileActions.uploadFileSetProgress(0))
          props.dispatch(fileActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            props.dispatch(userActions.signout())

          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message)
          }

          props.dispatch(fileActions.uploadFileFailed())
          props.dispatch(fileActions.uploadFileFinished())
        })

    } catch (error) {
      analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      props.dispatch(fileActions.uploadFileFailed())
      props.dispatch(fileActions.uploadFileFinished())
    }
  }

  useEffect(() => {
    const keyId = filesState.selectedItems.length > 0 && filesState.selectedItems[0].id

    setSelectedKeyId(keyId)
  }, [filesState])

  if (!props.authenticationState.loggedIn) {
    props.navigation.replace('Login')
  }

  return <View style={styles.container}>
    <FileDetailsModal key={selectedKeyId} />
    <SettingsModal navigation={props.navigation} />
    <SortModal />
    <DeleteItemModal />
    <MoveFilesModal />
    <ShareFilesModal />
    <FreeForYouModal navigation={props.navigation} />

    <View style={styles.platformSpecificHeight}></View>

    <AppMenu navigation={props.navigation} />

    <View style={styles.breadcrumbs}>
      <Text style={styles.breadcrumbsTitle}>
        {filesState.folderContent && filesState.folderContent.parentId
          ? filesState.folderContent.name
          : strings.screens.file_explorer.title}
      </Text>

      <TouchableOpacity
        onPress={() => {
          props.dispatch(fileActions.getFolderContent(parentFolderId))
        }}>
        <View style={parentFolderId ? styles.backButtonWrapper : styles.backHidden}>
          <Image style={styles.backIcon} source={getIcon('back')} />

          <Text style={styles.backLabel}>{strings.components.buttons.back}</Text>
        </View>
      </TouchableOpacity>
    </View>

    {
      props.filesState.loading && !props.filesState.isUploading ?
        <View style={styles.activityIndicator}>
          <WaveIndicator color="#5291ff" size={80} />
        </View>
        :
        <FileList />
    }
  </View>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileExplorer)

const styles = StyleSheet.create({
  activityIndicator: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  backButtonWrapper: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    marginRight: 20,
    width: '100%'
  },
  backHidden: {
    display: 'none'
  },
  backIcon: {
    height: 12,
    marginRight: 5,
    width: 8
  },
  backLabel: {
    color: '#000000',
    fontFamily: 'CircularStd-Medium',
    fontSize: 19,
    letterSpacing: -0.2
  },
  breadcrumbs: {
    alignItems: 'center',
    borderBottomColor: '#e6e6e6',
    borderBottomWidth: 1,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    height: 40,
    justifyContent: 'space-between',
    marginTop: 15
  },
  breadcrumbsTitle: {
    color: '#000000',
    fontFamily: 'CircularStd-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'flex-start'
  },
  platformSpecificHeight: {
    height: Platform.OS === 'ios' ? '5%' : '0%'
  }
});
