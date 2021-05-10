import React, { useState, useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import PhotoList from '../../components/PhotoList';
import { MaterialIndicator, WaveIndicator } from 'react-native-indicators';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { IApiPhotoWithPreview } from '../../types/api/photos/IApiPhoto';

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
  isSyncing: boolean
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>(props.photosState.photosToRender.photos)
  const [uploadedPhoto, setUploadedPhoto] = useState<any>()

  const loadUploadedPhotos = async () => {
    let finished = false
    let offset = 0
    let lastIndex = 0

    while (!finished) {
      const previews = await getPreviews(setUploadedPhoto, lastIndex)

      lastIndex = offset + previews.length

      if (lastIndex <= offset) {
        finished = true
      } else {
        offset = lastIndex
      }
    }
  }

  useEffect(() => {
    const currentPhotos = photosToRender.slice()
    const newPhotos = props.photosState.photosToRender.photos

    newPhotos.forEach(newPhoto => {
      const index = currentPhotos.findIndex(currPhoto => currPhoto.hash === newPhoto.hash)

      if (index === -1) {
        currentPhotos.push(newPhoto)
      } else {
        if (currentPhotos[index].isUploaded && !currentPhotos[index].isLocal) {
          currentPhotos[index].isLocal = true
        }
      }
    })
    setPhotosToRender(currentPhotos)
  }, [props.photosState.photosToRender])

  const updateDownloadedImageStatus = (remotePreview: IApiPhotoWithPreview, downloadedPhoto: IHashedPhoto) => {
    const index = photosToRender.findIndex(local => local.hash === remotePreview.hash)
    const items = photosToRender.slice()
    const newLocal = downloadedPhoto

    newLocal.isLocal = true
    newLocal.isUploaded = true
    items[index] = newLocal

    setPhotosToRender(items)
  }

  useEffect(() => {
    if (uploadedPhoto) {
      const index = photosToRender.findIndex(local => local.hash === uploadedPhoto.hash)

      if (index === -1) {
        const downloadedPhoto = { ...uploadedPhoto, isLocal: false }

        setPhotosToRender(currentPhotos => [...currentPhotos, downloadedPhoto])
      } else {
        const items = photosToRender.slice()

        items[index].isUploaded = true
        setPhotosToRender(items)
      }
    }
  }, [uploadedPhoto])

  useEffect(() => {
    loadUploadedPhotos()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <AlbumDetailsModal />
      <AddItemToModal />

      <View style={styles.albumHeader}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => props.navigation.navigate('Photos')}
        >
          <Image style={styles.icon} source={require('../../../assets/icons/icon-back.png')} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {strings.screens.photos.screens.photo_gallery.title}
          </Text>

          <Text style={styles.photosCount}>
            {photosToRender.length} {strings.screens.photos.screens.photo_gallery.subtitle}
          </Text>
        </View>

        {
          !props.photosState.isSyncing ?
            null
            :
            <View style={styles.containerSync}>
              <Text style={styles.syncText}>{strings.screens.photos.components.syncing}</Text>

              <View>
                <MaterialIndicator style={styles.spinner} color="#5291ff" size={15} />
              </View>
            </View>
        }
      </View>

      <View style={{ flex: 1 }}>
        {
          !isLoading ?
            <PhotoList
              data={photosToRender}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatList}
              onEndReached={() => {
                // change isLoading for another state, small indicator right on the bottom
                //setIsLoading(true)
                //loadLocalPhotos(endCursor)
                /* if (hasFinished) {
                  loadMorePhotos(offsetCursor, endCursor)
                } */
              }}
              updateDownloadedImageStatus={updateDownloadedImageStatus}
            />
            :
            <WaveIndicator color="#5291ff" size={50} />
        }
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  albumHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '8%',
    justifyContent: 'space-between'
  },
  buttonWrapper: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
    width: 45
  },
  icon: {
    height: 18,
    tintColor: '#0084ff',
    width: 11
  },
  albumTitle: {
    color: '#000000',
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    textAlign: 'center'
  },
  container: {
    alignContent: 'center',
    backgroundColor: '#fff',
    flex: 1,
    paddingBottom: 15
  },
  containerSync: {
    flexDirection: 'row',
    marginRight: 8
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  },
  photosCount: {
    color: '#bfbfbf',
    fontFamily: 'Averta-Regular',
    fontSize: 13,
    letterSpacing: 0,
    paddingTop: 5,
    textAlign: 'center'
  },
  spinner: {
  },
  syncText: {
    color: 'grey',
    fontFamily: 'Averta-Bold',
    marginRight: 8
  },
  titleWrapper: {
    display: 'flex',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: -2
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoGallery);