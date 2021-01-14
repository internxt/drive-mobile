import { getDocumentAsync } from 'expo-document-picker';
import { launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';
import React, { Fragment, useState, useRef, useEffect } from 'react'
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

export const uploadFile = async (result: any, currentFolder: number, props: AppMenuProps) => {
  console.log('(result)', result)
  /* THREE POSSIBLE RESULTS
    NORMAL UPLOAD => {"name": "IMG_20210113_120939.jpg", "size": 145374, "type": "success", "uri": "content://com.android.providers.media.documents/document/image%3A38"}
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

    if (result.uri) {
      // Set name for pics/photos
      if (!result.name) {
        result.name = result.uri.split('/').pop()
        props.dispatch(fileActions.uploadFileStart(result.name))
      }

      file = result.uri.replace(regex, '$2')
      finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri)
      currFolder = props.filesState.folderContent.currentFolder

    } else {
      if (result.url) {
        result.name = result.url.split('/').pop()
        props.dispatch(fileActions.uploadFileStart(result.name))

        file = result.url.replace(regex, '$2')
        finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.url)
        currFolder = currentFolder

      } else {
        name = result.split('/').pop()
        props.dispatch(fileActions.uploadFileStart(result.name))
        console.log('(result.name)', result.name)

        file = result.replace(regex, '$2')
        finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result)
        currFolder = currentFolder
      }
    }
    console.log('(name) xfile', '(filename)', name, '(data)', finalUri)

    console.log('RESULT', result)

    RNFetchBlob.fetch( 'POST', `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${currFolder}/upload`, headers,
      [
        { name: 'xfile', filename: name, data: finalUri }
      ] )
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
          console.log(err.message)
          Alert.alert('Error', 'Cannot upload file\n' + err.message)
        }

        props.filesState.uri && props.filesState.uri !== undefined ? props.dispatch(fileActions.setUri(undefined)) : null
        props.dispatch(fileActions.uploadFileFailed())
        props.dispatch(fileActions.uploadFileFinished())
      })

  } catch (error) {
    analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
    console.log(error)
    props.filesState.uri !== undefined ? props.dispatch(fileActions.setUri(undefined)) : null
    props.dispatch(fileActions.uploadFileFailed())
    props.dispatch(fileActions.uploadFileFinished())
  }
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
                        uploadFile(result, props)
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
                        uploadFile(result, props)
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
                        uploadFile(result, props)
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