import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, BackHandler, Platform, Alert } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { fileActions, userActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
import FileDetailsModal from '../../modals/FileDetailsModal';
import SortModal from '../../modals/SortModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import { Reducers } from '../../redux/reducers/reducers';
import analytics, { getLyticsData } from '../../helpers/lytics';
import RNFetchBlob from 'rn-fetch-blob';

interface FileExplorerProps extends Reducers {
  navigation?: any
  filesState: any
  dispatch?: any,
  layoutState: any
  authenticationState: any
}

function FileExplorer(props: FileExplorerProps): JSX.Element {
  const [selectedKeyId, setSelectedKeyId] = useState(0)
  const [folderId, setFolderId] = useState(0)

  const { filesState } = props;
  //const currentFolderId = props.navigation.state.params.folderId;
  const parentFolderId = (() => {
    if (props.filesState.folderContent) {
      return props.filesState.folderContent.parentId || null
    } else {
      return null
    }
  })()

  useEffect(() => {
    parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(filesState.folderContent)) : null
  }, [filesState.folderContent])

  if (Platform.OS === 'ios') {
    useEffect(() => {
      console.log('(file explorer uri)', filesState.uri)
      if (filesState.uri !== undefined && filesState.uri !== null && filesState.uri !== '') {
        console.log('(uri is not undefined, null or empty), (folderId)', folderId)
        const uri = filesState.uri
        const regex = /inxt:\/\//g
        let found

        uri.url ? found = uri.url.match(regex) : found = uri.match(regex)

        console.log('found', found)
        setTimeout(() => {
          !found ? uploadFile(uri, props.filesState.currentFolder) : null
        }, 3000)
      }
    }, [filesState.uri])

  } else {
    useEffect(() => {
      console.log('(file explorer uri)', filesState.uri)
      if (filesState.uri !== undefined && filesState.uri !== null && filesState.uri !== '') {
        if (filesState.folderContent) {
          if (filesState.folderContent.currentFolder) {
            console.log('(uri is not undefined, null or empty), (folderId)', folderId)
            const uri = filesState.uri
            const regex = /inxt:\/\//g
            let found

            uri.url ? found = uri.url.match(regex) : found = uri.match(regex)

            console.log('found', found)
            setTimeout(() => {
              !found ? uploadFile(uri, props.filesState.currentFolder) : null
            }, 2000)
          }
        }
      }
    }, [filesState.folderContent])
  }

  const uploadFile = async (result: any, currentFolder: number) => {
    console.log('(uploadFile result)', result)
    /* THREE POSSIBLE RESULTS
      SHARE TO WITH APP CLOSED => content://com.android.providers.media.documents/document/image%3A38
      SHARE TO WITH APP OPENED => {"url": "content://com.android.providers.media.documents/document/video%3A37"}
    */
    const userData = await getLyticsData()

    analytics.track('file-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => {})

    try {
      const token = props.authenticationState.token;
      const mnemonic = props.authenticationState.user.mnemonic;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data'
      }

      const regex = /^(.*:\/{0,2})\/?(.*)$/gm
      let file
      let finalUri
      let currFolder
      let name

      if (result.url) {
        result.name = result.url.split('/').pop()
        props.dispatch(fileActions.uploadFileStart(result.name))

        file = result.url.replace(regex, '$2')
        finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.url)
        currFolder = currentFolder

      } else {
        name = result.split('/').pop()
        props.dispatch(fileActions.uploadFileStart(name))
        console.log('(result.name)', name)

        file = result.replace(regex, '$2')
        finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(result)
        currFolder = currentFolder
      }

      console.log('(name) xfile', '(filename)', name, '(data)', finalUri)

      RNFetchBlob.fetch( 'POST', `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${currFolder}/upload`, headers,
        [
          { name: 'xfile', filename: name, data: finalUri }
        ])
        .uploadProgress({ count: 10 }, (sent, total) => {
          props.dispatch(fileActions.uploadFileSetProgress( sent / total ))

        })
        .then((res) => {
          console.log('(res)', res)
          console.log('(res status)', res.respInfo.status)
          //console.log('(first res)', res.text())
          if ( res.respInfo.status === 401) {
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
            props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.currentFolder))

          } else {
            //console.log('(second res)', res)
            Alert.alert('Error', 'Can not upload file');
          }

          props.filesState.uri !== undefined ? props.dispatch(fileActions.setUri(undefined)) : null
          props.dispatch(fileActions.uploadFileSetProgress(0))
          props.dispatch(fileActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            props.dispatch(userActions.signout())

          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message)
          }
          console.log('second catch', err)

          props.filesState.uri && props.filesState.uri !== undefined ? props.dispatch(fileActions.setUri(undefined)) : null
          props.dispatch(fileActions.uploadFileFailed())
          props.dispatch(fileActions.uploadFileFinished())
        })

    } catch (error) {
      analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      console.log('first catch', error)
      props.filesState.uri !== undefined ? props.dispatch(fileActions.setUri(undefined)) : null
      props.dispatch(fileActions.uploadFileFailed())
      props.dispatch(fileActions.uploadFileFinished())
    }
  }

  useEffect(() => {
    const backAction = () => {
      if (parentFolderId) {
        // eslint-disable-next-line no-console
        console.log('back') // do not delete
        // Go to parent folder if exists
        props.dispatch(fileActions.getFolderContent(parentFolderId))
      } else {
        // Exit application if root folder
        BackHandler.exitApp()
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const keyId = props.filesState.selectedItems.length > 0 && props.filesState.selectedItems[0].id

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

    <View style={styles.platformSpecificHeight}></View>

    <AppMenu navigation={props.navigation} />

    <View style={styles.breadcrumbs}>
      <Text style={styles.breadcrumbsTitle}>
        {filesState.folderContent && filesState.folderContent.parentId
          ? filesState.folderContent.name
          : 'All Files'}
      </Text>

      <TouchableHighlight
        underlayColor="#FFF"
        onPress={() => {
          props.dispatch(fileActions.getFolderContent(parentFolderId))
        }}>
        <View style={parentFolderId ? styles.backButtonWrapper : styles.backHidden}>
          <Image style={styles.backIcon} source={getIcon('back')} />

          <Text style={styles.backLabel}>Back</Text>
        </View>
      </TouchableHighlight>
    </View>

    <FileList />
  </View>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileExplorer)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
  },
  breadcrumbs: {
    display: 'flex',
    flexWrap: 'nowrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: '#e6e6e6',
    borderBottomWidth: 1,
    marginTop: 15,
    paddingBottom: 15
  },
  breadcrumbsTitle: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20,
    color: '#000000'
  },
  backButtonWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  backIcon: {
    height: 12,
    width: 8,
    marginRight: 5
  },
  backLabel: {
    fontFamily: 'CircularStd-Medium',
    fontSize: 19,
    letterSpacing: -0.2,
    color: '#000000'
  },
  backHidden: {
    display: 'none'
  },
  platformSpecificHeight: {
    height: Platform.OS === 'ios' ? '5%' : '0%'
  }
});
