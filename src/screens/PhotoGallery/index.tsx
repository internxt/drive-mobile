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
import { MaterialIndicator } from 'react-native-indicators';
import { getLocalImages, getPreviewsUploaded, IHashedPhoto, initUser, LocalImages, stopSync, syncPhotos } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { getRepositoriesDB } from '../../database/DBUtils.ts/utils';
import { Previews } from '../../database/models/previews';
import { PhotoActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { queue } from 'async';
import Photo from '../../components/PhotoList/Photo';
import EmptyPhotoList from '../../components/PhotoList/EmptyPhotoList';

export interface IPhotoGalleryProps extends Reducers {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
  loggedIn: boolean
  isSyncing: boolean
  isSaveDB: boolean
  photosToRender: IPhotosToRender
}
export interface IPhotosToRender {
  photos: IHashedPhoto[]
  hasNextPage: boolean
}

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [photosToRender, setPhotosToRender] = useState<any[]>([])
  const [uploadedPreviews, setUploadedPreviews] = useState<Previews[]>([])
  const [photos, setPhotos] = useState<IHashedPhoto[]>([])
  const [hasMoreLocals, setHasMoreLocals] = useState(true)

  const syncQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  const getPhotosToRender = async () => {
    let finished = false
    let lastPickedImage: string | undefined = undefined
    let photos: IHashedPhoto[] = []
    const syncActions: Promise<unknown>[] = []

    props.dispatch(PhotoActions.startSync())

    while (!finished) {
      const res: LocalImages = await getLocalImages(lastPickedImage)

      const syncAction = () => new Promise<unknown>(resolved => {
        syncQueue.push(() => syncPhotos(res.assets, props.dispatch), resolved)
      })

      setPhotos(currentPhotos => currentPhotos.length > 0 ? currentPhotos.concat(res.assets) : res.assets)
      syncActions.push(syncAction())

      photos = (photos.length > 0 ? photos.concat(res.assets) : res.assets).map(photo => ({ ...photo, isLocal: true, isUploaded: false }))
      const payload: IPhotosToRender = { photos, hasNextPage: res.hasNextPage }

      props.dispatch(PhotoActions.setPhotosToRender(payload))

      if (res.hasNextPage) {
        lastPickedImage = res.endCursor
      } else {
        finished = true
        setHasMoreLocals(false)
      }
    }

    await Promise.all(syncActions).then(() => {
      props.dispatch(PhotoActions.stopSync())
    })
  }

  const reloadLocalPhotos = () => {
    initUser().finally(() => getPhotosToRender());
  };

  //USE EFFECT TO START GETTING DATA
  useEffect(() => {
    getPreviewsUploaded(props.dispatch)
    setPhotos([])
    reloadLocalPhotos();
    startGettingRepositories()
  }, [])

  //USE EFFECT FOR THE USER DO SIGNOUT
  useEffect(() => {
    if (!props.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.loggedIn])

  const startGettingRepositories = () => {
    return getRepositoriesDB().then((res) => {
      props.dispatch(PhotoActions.viewDB())
      setUploadedPreviews(res.previews)
      return res;
    })
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

  const check = () => {
    const currentPhotos = photosToRender.slice()
    const newPhotos = props.photosToRender.photos

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
  }

  //USE EFFECT TO LISTEN DB CHANGES
  useEffect(() => {
    if (props.isSaveDB) {
      getRepositoriesDB().then((res) => {
        setPhotosToRender(prevPhotos => [...prevPhotos, res.previews])
        props.dispatch(PhotoActions.viewDB())
        checkPhotosDB(res.previews)
      })
    }
  }, [props.isSaveDB])

  //USE EFFECT FOR CHECK THE SYNCED
  useEffect(() => {
    checkSynced()
  }, [photosToRender, uploadedPreviews])

  useEffect(() => {
    check()
  }, [props.photosToRender.photos])

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
          !props.isSyncing ?
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
          photosToRender.length ?
            <FlatList
              data={photosToRender}
              numColumns={3}
              keyExtractor={item => item.hash}
              contentContainerStyle={styles.flatList}
              renderItem={({ item }) => <Photo item={item} key={item.hash} updateDownloadedImageStatus={updateDownloadedImageStatus}
              />}
            />
            :
            <EmptyPhotoList />

        }
      </View>
    </SafeAreaView>
  );
}

const mapStateToProps = (state: any) => {
  return {
    isSyncing: state.photosState.isSyncing,
    loggedIn: state.authenticationState.loggedIn,
    isSaveDB: state.photosState.isSaveDB,
    photosToRender: state.photosState.photosToRender
  };
}

export default connect(mapStateToProps)(PhotoGallery)

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