import { getDocumentAsync } from 'expo-document-picker';
import { launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';
import React, { Fragment, useState, useRef, useEffect } from 'react'
import { View, StyleSheet, Platform, TextInput, Image, Alert } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { connect } from 'react-redux';
import axios from 'axios'
import RNFetchBlob from 'rn-fetch-blob';
import { getLyticsData } from '../../helpers';
import { getIcon } from '../../helpers/getIcon';
import analytics from '../../helpers/lytics';
import { PhotoActions, layoutActions, userActions } from '../../redux/actions';
import MenuItem from '../MenuItem';
import { previewsStorage } from '../../helpers/previewsStorage';
import { createNavigator } from 'react-navigation';

interface AppMenuProps {
  navigation?: any
  filesState?: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function AppMenuPhotos(props: AppMenuProps) {
  const [activeSearchBox, setActiveSearchBox] = useState(false)
  const [hasSpace, setHasSpace] = useState(true)
  const selectedItems = props.photosState.selectedItems;
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

  const uploadPreview = async (preview: any, props: any, headers: any) => {
    const body = new FormData();

    preview.uri.replace('file:///', 'file:/');

    body.append('xfile', preview, preview.name);
    body.append('photoId', preview.photoId);

    const regex = /^(.*:\/{0,2})\/?(.*)$/gm
    const file = preview.uri.replace(regex, '$2')

    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(preview.uri);

    RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
      [
        { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
      ])
      .uploadProgress({ count: 10 }, (sent, total) => {

      })
      .then((res) => {
        if (res.respInfo.status === 401) {
          throw res;
        }

        const data = res;

        return { res: res, data };
      })
      .then(res => {
        if (res.res.respInfo.status === 402) {

        } else if (res.res.respInfo.status === 201) {
          // PREVIEW UPLOADED
        } else {

        }
      })
      .catch((err) => {
        if (err.status === 401) {
          props.dispatch(userActions.signout())
        } else {
          console.log('Cannot upload photo\n' + err)
        }
      })
  }

  const uploadPhoto = async (result: any, props: any) => {

    const userData = await getLyticsData()

    analytics.track('photo-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })

    try {
      // Set name for pics/photos
      if (!result.name) {
        result.name = result.uri.split('/').pop();
      }

      const token = props.authenticationState.token;
      const mnemonic = props.authenticationState.user.mnemonic;

      props.dispatch(PhotoActions.uploadPhotoStart(result.name));
      const regex = /^(.*:\/{0,2})\/?(.*)$/gm

      const body = new FormData();

      body.append('xfile', result, result.name);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data'
      };

      const file = result.uri.replace(regex, '$2')

      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri);

      RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/upload`, headers,
        [
          { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
        ])
        .uploadProgress({ count: 10 }, (sent, total) => {
          props.dispatch(PhotoActions.uploadPhotoSetProgress(sent / total))

        })
        .then((res) => {
          if (res.respInfo.status === 401) {
            throw res;
          } else if (res.respInfo.status === 402) {
            setHasSpace(false)

          } else if (res.respInfo.status === 201) {
            return res.json();
          } else {
            Alert.alert('Error', 'Cannot upload photo');
          }
        })
        .then(async res => {
          analytics.track('photo-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { });

          // Create photo preview and store on device
          const prev = await ImageManipulator.manipulateAsync(
            result.uri,
            [{ resize: { width: 220 } }],
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
          );

          await FileSystem.copyAsync({
            from: prev.uri,
            to: FileSystem.documentDirectory + 'previews/' + result.name
          });

          const preview = {
            uri: FileSystem.documentDirectory + 'previews/' + result.name,
            height: prev.height,
            widht: prev.width,
            name: result.name,
            photoId: res.id
          };

          uploadPreview(preview, props, headers);

          props.dispatch(PhotoActions.getAllPhotosContent(props.authenticationState.user));
          props.dispatch(PhotoActions.uploadPhotoSetProgress(0));
          props.dispatch(PhotoActions.uploadPhotoFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            props.dispatch(userActions.signout())

          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err)
          }

          console.log("2", err)
          props.dispatch(PhotoActions.uploadPhotoFailed());
          props.dispatch(PhotoActions.uploadPhotoFinished());
        })

    } catch (error) {
      console.log("1", error)
      analytics.track('photo-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      props.dispatch(PhotoActions.uploadPhotoFailed());
      props.dispatch(PhotoActions.uploadPhotoFinished());
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
          props.dispatch(PhotoActions.setSearchString(e.nativeEvent.text))
        }}
      />

      <TouchableWithoutFeedback
        onPress={() => {
          props.dispatch(PhotoActions.setSearchString(''));
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
            name="upload"
            onClickHandler={() => {
              Alert.alert('Select media', '', [
                {
                  text: 'Upload media',
                  onPress: async () => {
                    const { status } = await requestCameraPermissionsAsync()

                    if (status === 'granted') {
                      const result = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.All })

                      if (!result.cancelled) {
                        //props.dispatch(PhotoActions.add)
                        uploadPhoto(result, props)
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
                        uploadPhoto(result, props)
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
              props.navigation.navigate('CreateAlbum')
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
    fontFamily: 'Averta-Regular',
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

export default connect(mapStateToProps)(AppMenuPhotos)