import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, SafeAreaView } from 'react-native'
import { connect } from 'react-redux';
import { TouchableOpacity } from 'react-native-gesture-handler';
import SortModal from '../../modals/SortModal';
import { Reducers } from '../../redux/reducers/reducers';
import PhotoList from '../../components/PhotoList';
import CreateAlbumCard from '../../components/AlbumCard/CreateAlbumCard';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import SettingsModal from '../../modals/SettingsModal';
import { stopSync, initUser, getLocalImages, IHashedPhoto, syncPhotos, LocalImages } from './init'
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { WaveIndicator, MaterialIndicator } from 'react-native-indicators';
import ComingSoonModal from '../../modals/ComingSoonModal';
import MenuItem from '../../components/MenuItem';
import { layoutActions, PhotoActions } from '../../redux/actions';
import strings from '../../../assets/lang/strings';
import { queue } from 'async'
import EmptyPhotoList from '../../components/PhotoList/EmptyPhotoList';
import AppMenuPhotos from '../../components/AppMenu/AppMenuPhotos';

export interface IPhotosProps extends Reducers {
  navigation: any
  dispatch: any
  photosState: PhotosState
  loggedIn: boolean
  isSyncing: boolean
}

export interface IPhotosToRender {
  photos: IHashedPhoto[]
  hasNextPage: boolean
}

function Photos(props: IPhotosProps): JSX.Element {
  const [photos, setPhotos] = useState<IHashedPhoto[]>([])
  const [hasMoreLocals, setHasMoreLocals] = useState(true)
  const [albums, setAlbums] = useState<IAlbum[]>([])

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
        syncQueue.push(() => syncPhotos(res.assets), resolved)
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

  useEffect(() => {
    setPhotos([])
    reloadLocalPhotos()
  }, [])

  useEffect(() => {
    if (!props.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.loggedIn])

  return (
    <SafeAreaView style={styles.container}>
      <SettingsModal navigation={props.navigation} />
      <SortModal />
      <ComingSoonModal />

      <AppMenuPhotos navigation={props.navigation} />

      <View style={styles.albumsContainer}>
        <View style={styles.albumsHeader}>
          <Text style={styles.title}>{strings.screens.photos.screens.photos.albums}</Text>

          <MenuItem
            name="settings"
            onClickHandler={() => {
              props.dispatch(layoutActions.openSettings());
            }} />

        </View>

        <View>
          <CreateAlbumCard navigation={props.navigation} dispatch={props.dispatch} />
        </View>
      </View>

      <View style={styles.allPhotosContainer}>
        <TouchableOpacity style={styles.titleButton}
          onPress={() => {
            props.navigation.navigate('PhotoGallery')
          }}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{strings.screens.photos.screens.photos.all_photos}</Text>
            <Text> - {photos.length}</Text>
            {hasMoreLocals
              ? <View><MaterialIndicator style={styles.photosSpinner} color='grey' size={10} /></View>
              : null
            }
          </View>

          {
            props.isSyncing ?
              <View style={styles.containerSync}>
                <Text style={styles.syncText}>{strings.screens.photos.components.syncing}</Text>

                <View>
                  <MaterialIndicator color="#5291ff" size={15} />
                </View>
              </View>
              :
              null
          }
        </TouchableOpacity>
        {
          photos.length === 0 ?
            hasMoreLocals ?
              <View style={styles.emptyContainer}>
                <Text style={styles.heading}>{strings.screens.photos.components.loading}</Text>
                <WaveIndicator color="#5291ff" size={50} />
              </View>
              :
              <EmptyPhotoList />
            :
            <View style={{ flex: 1 }}>
              <PhotoList
                title={'All Photos'}
                data={photos}
                navigation={props.navigation}
              //onRefresh={() => getNextImages()}
              />
            </View>
        }
      </View>
    </SafeAreaView>
  )
}

const mapStateToProps = (state: any) => {
  return {
    loggedIn: state.authenticationState.loggedIn,
    isSyncing: state.photosState.isSyncing
  }
}

export default connect(mapStateToProps)(Photos)

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'flex-start'
  },
  albumsContainer: {
    height: 'auto',
    paddingHorizontal: wp('1'),
    paddingVertical: wp('3.5')
  },
  albumsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between'
  },
  allPhotosContainer: {
    flex: 1
  },
  titleContainer: {
    flexDirection: 'row'
  },
  containerSync: {
    flexDirection: 'row',
    marginRight: 8
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    color: '#000000',
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    marginBottom: 30,
    marginTop: 10
  },
  syncText: {
    color: 'grey',
    fontFamily: 'Averta-Bold',
    marginRight: 8
  },
  title: {
    flexDirection: 'row',
    alignSelf: 'center',
    color: 'black',
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    marginLeft: 7
  },
  photosSpinner: {
    marginLeft: 6
  },
  titleButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: wp('1'),
    paddingHorizontal: wp('1')
  }
});