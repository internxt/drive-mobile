import { getDocumentAsync } from 'expo-document-picker';
import { launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';
import { uniqueId } from 'lodash';
import React, { Fragment, useState, useRef } from 'react'
import { View, StyleSheet, Platform, TextInput, Image, Alert } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import { getLyticsData } from '../../helpers';
import { getIcon } from '../../helpers/getIcon';
import analytics from '../../helpers/lytics';
import { fileActions, layoutActions, userActions } from '../../redux/actions';
import MenuItem from '../MenuItem';

interface AppMenuProps {
  navigation?: any
  filesState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function AppMenu(props: AppMenuProps) {
  const [activeSearchBox, setActiveSearchBox] = useState(false)
  const selectedItems = props.filesState.selectedItems;
  const textInput = useRef<TextInput>(null)

  const handleClickSearch = () => {
    if (textInput && textInput.current) {
      textInput.current.focus();
    }
  }

  const closeSearch = () => {
    if (textInput && textInput.current) {
      textInput.current.blur();
    }
  }

  const uploadFile = (result: any, currentFolder: number | undefined) => {
    props.dispatch(fileActions.uploadFileStart())

    const userData = getLyticsData().then((res) => {
      analytics.track('file-upload-start', { userId: res.uuid, email: res.email, device: 'mobile' }).catch(() => {})
    })

    try {
      // Set name for pics/photos
      if (!result.name) {
        result.name = result.uri.split('/').pop()
      }
      //result.type = 'application/octet-stream';

      const token = props.authenticationState.token
      const mnemonic = props.authenticationState.user.mnemonic

      const headers = {
        'Authorization': `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data'
      };

      const regex = /^(.*:\/{0,2})\/?(.*)$/gm
      const file = result.uri.replace(regex, '$2')

      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(result.uri)

      RNFetchBlob.fetch( 'POST', `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${currentFolder}/upload`, headers,
        [
          { name: 'xfile', filename: result.name, data: finalUri }
        ] )
        .uploadProgress({ count: 10 }, async (sent, total) => {
          props.dispatch(fileActions.uploadFileSetProgress( sent / total, result.id ))
          //console.log('--- UPLOAD PROGRESS appmenu ---', sent / total, '(sent)', sent, '(total)', total )

          if (sent / total >= 1) { // Once upload is finished (on small files it almost never reaches 100% as it uploads really fast)
            props.dispatch(fileActions.removeUploadingFile(result.id))
            props.dispatch(fileActions.uploadFileSetUri(result.uri)) // Set the uri of the file so FileItem can get it as props
            console.log('--- FINISHED ---', result.name)
          }
        })
        .then((res) => {
          //console.log(res.respInfo.status)
          props.dispatch(fileActions.uploadFileSetUri(undefined))
          if (res.respInfo.status === 401) {
            throw res;

          } else if (res.respInfo.status === 402) {
            // setHasSpace

          } else if (res.respInfo.status === 201) {
            props.dispatch(fileActions.fetchIfSameFolder(result.currentFolder))

            analytics.track('file-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })

          } else if (res.respInfo.status !== 502) {
            Alert.alert('Error', 'Cannot upload file');
          }

          props.dispatch(fileActions.uploadFileFinished(result.name))
          //props.dispatch(fileActions.removeUploadingFile(result.id))
        })
        .catch((err) => {
          console.log(err)
          if (err.status === 401) {
            props.dispatch(userActions.signout())

          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err)
          }

          props.dispatch(fileActions.uploadFileFailed())
          props.dispatch(fileActions.uploadFileFinished(result.name))
          //props.dispatch(fileActions.removeUploadingFile(result.id))
        })

    } catch (error) {
      analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      props.dispatch(fileActions.uploadFileFailed())
      props.dispatch(fileActions.uploadFileFinished(result.name))
      console.log(error)
    }
  }

  return <View
    style={styles.container}>

    <View style={[styles.searchContainer, { display: activeSearchBox ? 'flex' : 'none' }]}>
      <Image
        style={{ marginLeft: 20, marginRight: 10 }}
        source={getIcon('search')}
      />

      <TextInput
        ref={textInput}
        style={styles.searchInput}
        placeholder="Search"
        value={props.filesState.searchString}
        onChange={e => {
          props.dispatch(fileActions.setSearchString(e.nativeEvent.text))
        }}
      />

      <TouchableWithoutFeedback
        onPress={() => {
          props.dispatch(fileActions.setSearchString(''));
          props.dispatch(layoutActions.closeSearch());
          setActiveSearchBox(false)
          closeSearch()
        }}
      >
        <Image
          style={{ marginLeft: 10, marginRight: 20, height: 16, width: 16 }}
          source={getIcon('close')}
        />
      </TouchableWithoutFeedback>
    </View>

    <Fragment>
      <View style={[styles.buttonContainer, { display: activeSearchBox ? 'none' : 'flex' }]}>
        <View style={styles.commonButtons}>
          <MenuItem
            style={styles.mr10}
            name="search"
            onClickHandler={() => {
              setActiveSearchBox(true)
              props.dispatch(layoutActions.openSearch())
              handleClickSearch()

            }} />

          <MenuItem
            style={styles.mr10}
            name="list"
            onClickHandler={() => {
              props.dispatch(layoutActions.closeSearch())
              props.dispatch(layoutActions.openSortModal())
            }} />

          <MenuItem
            style={styles.mr10}
            name="upload"
            onClickHandler={() => {
              Alert.alert('Select type of file', '', [
                {
                  text: 'Upload a document',
                  onPress: async () => {
                    const { status } = await requestCameraPermissionsAsync()

                    if (status === 'granted') {
                      const result = await getDocumentAsync({ copyToCacheDirectory: false })

                      if (result.type !== 'cancel') {
                        const fileUploading: any = result

                        fileUploading.progress = 0
                        fileUploading.currentFolder = props.filesState.folderContent.currentFolder
                        fileUploading.createdAt = new Date()
                        fileUploading.id = uniqueId()

                        console.log('This is a document =>', fileUploading)

                        props.dispatch(fileActions.addUploadingFile(fileUploading))
                        uploadFile(fileUploading, props.filesState.folderContent.currentFolder)
                      }
                    } else {
                      Alert.alert('Camera permission needed to perform this action')
                    }
                  }
                },
                {
                  text: 'Upload media',
                  onPress: async () => {
                    const { status } = await requestCameraPermissionsAsync()

                    if (status === 'granted') {
                      const result = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.All })

                      if (!result.cancelled) {
                        const fileUploading: any = result

                        // Set name for pics/photos
                        if (!fileUploading.name) {
                          fileUploading.name = result.uri.split('/').pop()
                        }
                        fileUploading.progress = 0
                        fileUploading.currentFolder = props.filesState.folderContent.currentFolder
                        fileUploading.createdAt = new Date()
                        fileUploading.id = uniqueId()

                        console.log('This is a photo =>', result)

                        props.dispatch(fileActions.addUploadingFile(fileUploading))
                        uploadFile(fileUploading, fileUploading.currentFolder)
                      }
                    } else {
                      Alert.alert('Camera permission needed to perform this action')
                    }
                  }
                },
                {
                  text: 'Take a photo',
                  onPress: async () => {
                    const { status } = await requestCameraPermissionsAsync()

                    if (status === 'granted') {
                      const result = await launchCameraAsync()

                      if (!result.cancelled) {
                        const fileUploading: any = result

                        // Set name for pics/photos
                        if (!fileUploading.name) {
                          fileUploading.name = result.uri.split('/').pop()
                        }
                        fileUploading.progress = 0
                        fileUploading.currentFolder = props.filesState.folderContent.currentFolder
                        fileUploading.createdAt = new Date()
                        fileUploading.id = uniqueId()

                        console.log('This is a taken photo =>', fileUploading)

                        props.dispatch(fileActions.addUploadingFile(fileUploading))
                        uploadFile(fileUploading, props.filesState.folderContent.currentFolder)
                      }
                    }
                  }
                },
                {
                  text: 'Cancel',
                  style: 'destructive'
                }
              ], {
                cancelable: Platform.OS === 'android'
              })
            }} />

          <MenuItem
            name="create"
            style={styles.mr10}
            onClickHandler={() => {
              props.navigation.replace('CreateFolder')
            }} />

          {
            selectedItems.length > 0 ?
              <MenuItem name="delete" onClickHandler={() => {
                props.dispatch(layoutActions.openDeleteModal())
              }} />
              :
              null
          }
        </View>

        <MenuItem
          name="settings"
          onClickHandler={() => {
            props.dispatch(layoutActions.openSettings());
          }} />
      </View>
    </Fragment>
  </View>
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    marginLeft: 17,
    marginRight: 10
  },
  commonButtons: {
    flexDirection: 'row',
    flexGrow: 1
  },
  container: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
    paddingTop: 3,
    marginTop: Platform.OS === 'ios' ? 30 : 0
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 30
  },
  searchInput: {
    marginLeft: 15,
    marginRight: 15,
    fontFamily: 'CerebriSans-Medium',
    fontSize: 17,
    flex: 1
  },
  mr10: {
    marginRight: 10
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AppMenu)