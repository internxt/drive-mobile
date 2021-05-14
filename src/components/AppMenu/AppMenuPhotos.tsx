import React, { Fragment, useState, useRef, useEffect } from 'react'
import { View, StyleSheet, Platform, TextInput, Image, Alert, SafeAreaView } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { connect } from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import { getLyticsData } from '../../helpers';
import { getIcon } from '../../helpers/getIcon';
import analytics from '../../helpers/lytics';
import { PhotoActions, layoutActions, userActions } from '../../redux/actions';
import MenuItem from '../MenuItem';

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

    RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
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

      RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/upload`, headers,
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

          props.dispatch(PhotoActions.uploadPhotoFailed());
          props.dispatch(PhotoActions.uploadPhotoFinished());
        })

    } catch (error) {
      analytics.track('photo-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
      props.dispatch(PhotoActions.uploadPhotoFailed());
      props.dispatch(PhotoActions.uploadPhotoFinished());
    }
  }

  return <SafeAreaView
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
        <MenuItem
          name="settings"
          onClickHandler={() => {
            props.dispatch(layoutActions.openSettings());
          }} />
      </View>
    </Fragment>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 17,
    marginRight: 10
  },
  container: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    height: 54,
    justifyContent: 'flex-start',
    paddingTop: 3,
    width: '100%'
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 30,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 20,
    marginRight: 20,
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Averta-Regular',
    fontSize: 17
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AppMenuPhotos)