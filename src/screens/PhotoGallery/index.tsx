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
import { getLocalImages, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { getRepositories } from '../../database/DBUtils.ts/utils';
import { Previews } from '../../database/models/previews';
import { PhotoActions } from '../../redux/actions';

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [photosToRender, setPhotosToRender] = useState<any[]>([])
  const [uploadedPhoto, setUploadedPhoto] = useState<any>()
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([])
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasFinished, setHasFinished] = useState(false)
  const [offsetCursor, setOffsetCursor] = useState(0)
  const [prevOffset, setPrevOffset] = useState(0)
  const [uploadedPreviews, setUploadedPreviews] = useState<Previews[]>([])

  const getPhotosToRender = (offset = 0, endCursor?: string) => {
    setHasFinished(false)

    return loadLocalPhotos(endCursor).then(() => {
    }).finally(() => {
      setHasFinished(true)
    })
  }

  const startGettingRepositories = () => {
    return getRepositories().then((res) => {
      props.dispatch(PhotoActions.viewDB())
      setUploadedPreviews(res.previews)
      return res;
    })
  }

  const loadLocalPhotos = (endCursor?: string) => {
    return getLocalImages(endCursor).then(localImages => {
      const assets = localImages.assets.map(photo => ({ ...photo, isLocal: true, isUploaded: false }))
      const photos = photosToRender.slice()

      assets.forEach(asset => {
        const index = photos.findIndex(photo => photo.hash === asset.hash)

        if (index === -1) {
          photos.push(asset)
        } else {
          if (photos[index].isUploaded === true && photos[index].isLocal === false) {
            photos[index].isLocal = true
          }
        }
      })

      setEndCursor(localImages.endCursor)
      setPhotosToRender(photos)
    }).finally(() => setIsLoading(false))
  }

  const checkSynced = () => {
    const items = photosToRender.slice()

    uploadedPreviews.map((preview) => {
      const index = items.findIndex(photo => photo.hash === preview.hash)

      if (index !== -1) {
        if (items[index].isLocal && !items[index].isUploaded) {
          items[index].isUploaded = true
          setPhotosToRender(items)
        }
      } else {
        setPhotosToRender(currentPhotos => [...currentPhotos, preview])
      }
    })
  }

  const checkPhotosDB = (listPreviews: Previews[]) => {
    listPreviews.map((preview) => {
      const index = photosToRender.findIndex(local => local.hash === preview.hash)

      if (index === -1) {

        preview.isLocal = false
        const downloadedPhoto = { ...preview }

        setPhotosToRender(currentPhotos => [...currentPhotos, downloadedPhoto])
      } else {
        const items = photosToRender.slice()

        items[index].isUploaded = true
        setPhotosToRender(items)
      }

    })
  }

  const updateDownloadedImageStatus = (remotePreview: Previews, downloadedPhoto: IHashedPhoto) => {
    const index = photosToRender.findIndex(local => local.hash === remotePreview.hash)
    const items = photosToRender.slice()
    const newLocal = downloadedPhoto

    newLocal.isLocal = true
    newLocal.isUploaded = true
    items[index] = newLocal

    setPhotosToRender(items)
  }

  //USE EFFECT TO START GETTING DATA
  useEffect(() => {
    getPhotosToRender(0, endCursor).finally(() => {
      setIsLoading(false)
    })

    startGettingRepositories().then((res) => {
    })
  }, [])

  //USE EFFECT TO LISTEN DB CHANGES
  useEffect(() => {
    if (props.photosState.isSaveDB) {
      getRepositories().then((res) => {
        setUploadedPreviews(res.previews)
        setPhotosToRender(res.previews)
        props.dispatch(PhotoActions.viewDB())
        checkPhotosDB(res.previews)
      })
    }
  }, [props.photosState.isSaveDB])

  //USE EFFECT FOR CHECK THE SYNCED
  useEffect(() => {
    checkSynced()
  }, [photosToRender, uploadedPreviews])

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
          !props.photosState.isSync ?
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
              onRefresh={() => {
                setIsLoading(true)
                setOffsetCursor(0)
                getPhotosToRender().then(() => { setHasFinished(false) }).catch(() => { })
              }}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatList}
              onEndReached={() => {
                loadLocalPhotos(endCursor)

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
  albumTitle: {
    color: '#000000',
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    textAlign: 'center'
  },
  buttonWrapper: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
    width: 45
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
  icon: {
    height: 18,
    tintColor: '#0084ff',
    width: 11
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