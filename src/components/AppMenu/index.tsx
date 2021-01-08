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

function AppMenu(props: AppMenuProps) {
  const [activeSearchBox, setActiveSearchBox] = useState(false)
  const [hasSpace, setHasSpace] = useState(true)
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

  useEffect(() => {
    if (!hasSpace) {
      props.navigation.replace('OutOfSpace')
    }
  }, [hasSpace])

  const uploadFile = async (result: any, props: any) => {

    const userData = await getLyticsData()

    analytics.track('file-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { console.log('--- tracking error ---') })

    try {
      // Set name for pics/photos
      if (!result.name) {
        result.name = result.uri.split('/').pop();
      }
      //result.type = 'application/octet-stream';

      props.dispatch(fileActions.uploadFileStart(result.name));
      const body = new FormData();
      const token = props.authenticationState.token;
      const mnemonic = props.authenticationState.user.mnemonic;

      body.append('xfile', result, result.name);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data'
      };

      const regex = /^(.*:\/{0,2})\/?(.*)$/gm
      const path = result.uri.replace(regex, '$1')
      const file = result.uri.replace(regex, '$2')

      console.log('--- uri ---' + ' (path) ' + path + ' || (original) ' + result.uri + ' || (extracted) ' + file + ' || (final) ' + RNFetchBlob.wrap(file))

      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri)
      //const finalSize = RNFetchBlob.fs.stat(finalUri).then(res => { return res.size })

      RNFetchBlob.fetch( 'POST', `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${props.filesState.folderContent.currentFolder}/upload`, headers,
        [
          { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
        ] )
        .uploadProgress({ count: 10 }, (sent, total) => {
          props.dispatch(fileActions.uploadFileSetProgress( sent / total ))
          console.log('--- UPLOAD PROGRESS appmenu ---', sent / total, '(sent)', sent, '(total)', total )
          if (sent / total >= 1) {
            console.log('--- FINISHED ---')
          }
          else {
            console.log('--- UPLOADING ---')
          }
        })
        .then((res) => {
          console.log('--- res 1 ---', res)
          if (res.respInfo.status === 401) {
            throw res;

          } else if (res.respInfo.status === 402) {
            setHasSpace(false)

          } else if (res.respInfo.status === 201) {
            analytics.track('file-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
            props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.currentFolder));

          } else {
            Alert.alert('Error', 'Cannot upload file');
            console.log('--- ERROR ---', res)
          }

          props.dispatch(fileActions.uploadFileSetProgress(0))
          props.dispatch(fileActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            props.dispatch(userActions.signout());
          } else {
            Alert.alert('Error', 'Cannot upload file\n' + 'Please try again');
          }
          props.dispatch(fileActions.uploadFileFailed());
          props.dispatch(fileActions.uploadFileFinished());
          console.log('--- ERROR 2 ---', err)
        })

    } catch (error) {
      analytics.track('file-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      props.dispatch(fileActions.uploadFileFailed());
      props.dispatch(fileActions.uploadFileFinished());
      console.log('--- ERROR 3 ---', error)
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