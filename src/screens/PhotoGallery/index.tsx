import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, SafeAreaView, View, FlatList, Text, Dimensions, Alert } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getLocalImages, getNullPreviews, getPreviews, getUploadedPhotos, IHashedPhoto, initUser, separatePhotos, stopSync, syncPhotos, syncPreviews } from './init'
import { getAlbumsRepository, getRepositoriesDB } from '../../database/DBUtils.ts/utils';
import { layoutActions, photoActions } from '../../redux/actions';
import { queue } from 'async';
import Photo from '../../components/PhotoList/Photo';
import Header from './Header';
import CreateAlbumModal from '../../modals/CreateAlbumModal';
import SelectPhotosModal from '../../modals/CreateAlbumModal/SelectPhotosModal';
import { tailwind } from '../../tailwind.js'
import AlbumCard from '../../components/AlbumCard';
import { IStoreReducers } from '../../types/redux';
import { getAlbums } from '../../modals/CreateAlbumModal/init';
import Footer from './Footer';
import SettingsModal from '../../modals/SettingsModal';
import SimpleToast from 'react-native-simple-toast';
import { store } from '../../store';
import allSettled from 'promise.allsettled'

interface IPhotoGalleryProps {
  navigation: any
  dispatch: Dispatch,
  loggedIn: boolean
  isSyncing: boolean
  isSavePhotosPreviewsDB: boolean
  photosToRender: IPhotosToRender
  showSelectPhotosModal: boolean
  showAlbumModal: boolean
  isSaveAlbumsDB: boolean
}

export interface IPhotosToRender {
  [hash: string]: IPhotoToRender
}

export interface IAlbumsToRender {
  [albumId: string]: {
    hashes: string[],
    name: string
  }
}

export interface IPhotoToRender extends IHashedPhoto {
  isLocal: boolean,
  isUploaded: boolean,
  isDownloading: boolean,
  isUploading: boolean,
  isSelected: boolean
}

export const objectFilter = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).filter(fn))
export const objectMap = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).map(([key, value], i) => [key, fn(value, key, i)]))
const DEVICE_WIDTH = Dimensions.get('window').width
const DEVICE_HEIGHT = Dimensions.get('window').height

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [albumTitle, setAlbumTitle] = useState('')
  const [searchString, setSearchString] = useState('')
  const [downloadReadyPhotos, setDownloadReadyPhotos] = useState<IPhotosToRender>({})
  const [uploadPendingPhotos, setUploadPendingPhotos] = useState<IPhotosToRender>({})
  const [normalPhotos, setNormalPhotos] = useState<IPhotosToRender>(props.photosToRender)
  const [photosToRender, setPhotosToRender] = useState<IPhotosToRender>(props.photosToRender)

  const [albums, setAlbums] = useState<IAlbumsToRender>({})
  const [filteredAlbums, setFilteredAlbums] = useState<IAlbumsToRender>({})
  const [photosForAlbumCreation, setPhotosForAlbumCreation] = useState<IPhotosToRender>({})
  const [isAlbumSelected, setIsAlbumSelected] = useState(false)
  const [albumPhotosToRender, setAlbumPhotosToRender] = useState<IPhotosToRender>({})

  const [hasMoreLocals, setHasMoreLocals] = useState<boolean>(false)
  const [nullablePreviews, setNullablePreviews] = useState<any>([])

  const startSyncProcess = async () => {
    let finished = false
    let lastPickedImage: string | undefined = undefined
    const syncActions: Promise<unknown>[] = []
    const syncQueue = queue(async (task: () => Promise<void>, callBack) => {
      await task()
      callBack()
    }, 1)
    const alreadyUploadedPhotos = await getUploadedPhotos()
    const withPreviews = alreadyUploadedPhotos.filter(photo => !!photo.preview)

    while (!finished) {
      const localPhotos = await getLocalImages(lastPickedImage)

      if (!localPhotos.assets) {
        finished = true
        Alert.alert('Permission denied', 'To be able to use Internxt Photos you must grant the app access to your gallery.')
        break
      }
      props.dispatch(photoActions.startSync())

      const imagesToUpload = separatePhotos(localPhotos.assets, withPreviews, alreadyUploadedPhotos)

      if (imagesToUpload.length) {
        const syncAction = () => new Promise<void>(resolved => {
          syncQueue.push(() => syncPhotos(imagesToUpload, props.dispatch), resolved)
        })

        syncActions.push(syncAction())
      }

      const newNext20 = localPhotos.assets.map(photo => ({
        ...photo,
        isLocal: true,
        isUploaded: false,
        isDownloading: false,
        isUploading: false,
        isSelected: false
      }))
      const newPhotos: IPhotosToRender = newNext20.reduce((acc, photo) => ({ ...acc, [photo.hash]: photo }), {})
      const currentPhotos: IPhotosToRender = store.getState().photosState.photosToRender // ask on #redux why this only works when getting it directly from the store

      Object.keys(newPhotos).forEach(key => {
        if (currentPhotos[key]) {
          if (!currentPhotos[key].isLocal && currentPhotos[key].isUploaded) {
            const pathToLocalImage = newPhotos[key].localUri

            props.dispatch(photoActions.updatePhotoStatus(key, true, true, pathToLocalImage))
          }
        } else {
          const photoObj = { [key]: newPhotos[key] }

          props.dispatch(photoActions.addPhotosToRender(photoObj))
        }
      })

      if (localPhotos.hasNextPage) {
        lastPickedImage = localPhotos.endCursor
      } else {
        finished = true
        setHasMoreLocals(true)
      }
    }

    await allSettled(syncActions).finally(() => props.dispatch(photoActions.stopSync()))
  }

  const uploadPreviewsNull = async (nullPreviews, localPhotos: any) => {
    if (nullPreviews.length === 0 || nullPreviews === null) {
      return;
    }
    const newPhotos = localPhotos
    const nulls = nullPreviews.reduce((acc, photo) => ({ ...acc, [photo.hash]: photo }), {})

    const result = []

    Object.keys(nulls).forEach(key => {
      if (newPhotos[key]) {
        newPhotos[key].photo = nulls[key]
      }
      result.push(newPhotos[key]);
    })
    return result;
  }

  const loadDataFromLocalDB = async () => {
    const { albums, albumsWithPreviews, previews } = await getRepositoriesDB()
    const currentPhotos = store.getState().photosState.photosToRender // ask on #redux why this only works when getting it directly from the store

    props.dispatch(photoActions.viewDB())
    props.dispatch(photoActions.viewAlbumsDB())

    const normalizedAlbumsWithPreviews = albumsWithPreviews.flatMap(x => x)
    const keyedPreviews = previews.reduce((acc, preview) => ({ ...acc, [preview.hash]: preview }), {}) as IPhotosToRender
    const keyedAlbums = albums.reduce((acc, album) => {
      acc[album.id] = {
        name: album.name,
        hashes: normalizedAlbumsWithPreviews.filter(preview => preview.albumId === album.id).map(preview => preview.hash)
      }
      return acc
    }, {})

    Object.keys(keyedPreviews).forEach(key => {
      if (currentPhotos[key]) {
        if (currentPhotos[key].isLocal && !currentPhotos[key].isUploaded) {
          props.dispatch(photoActions.updatePhotoStatus(key, true, true, undefined, keyedPreviews[key].photoId))
        }
      } else {
        const previewObj = { [key]: keyedPreviews[key] }

        props.dispatch(photoActions.addPhotosToRender(previewObj))
      }
    })

    setAlbums(keyedAlbums)
    setFilteredAlbums(keyedAlbums)
  }

  // filter the photos
  const handleFilterSelection = (filterName: string) => {
    selectedFilter === filterName ? setSelectedFilter('none') : setSelectedFilter(filterName)

    switch (true) {
    case filterName === 'upload' && (selectedFilter !== 'upload'):
      return setPhotosToRender(uploadPendingPhotos)

    case filterName === 'download' && (selectedFilter !== 'download'):
      return setPhotosToRender(downloadReadyPhotos)

    // if clicked on the same filter restore array
    case filterName === selectedFilter:
      return setPhotosToRender(normalPhotos)
    }
  }

  const handleAlbumOnPress = (albumPhotos: IPhotosToRender) => {
    setIsAlbumSelected(true)
    setAlbumPhotosToRender(albumPhotos)
  }

  useEffect(() => {
    initUser().then(() => {
      loadDataFromLocalDB().finally(() => startSyncProcess())
      getPreviews(props.dispatch)
      getAlbums()
      getNullPreviews().then((res) => {
        setNullablePreviews(res)
      })
    })
  }, [])

  useEffect(() => {
    const newFilteredAlbums = objectFilter(albums, ([key, album]) => album.name.search(searchString) !== -1)

    setFilteredAlbums(newFilteredAlbums)
  }, [searchString])

  // update the data at real time everytime a photo gets downloaded/synced/loaded
  useEffect(() => {
    const uploadPending = objectFilter(props.photosToRender, ([key, value]) => value.isLocal && !value.isUploaded) as IPhotosToRender
    const downloadReady = objectFilter(props.photosToRender, ([key, value]) => !value.isLocal && value.isUploaded) as IPhotosToRender
    const selectivePhotos = objectFilter(props.photosToRender, ([key, value]) => value.isUploaded === true) as IPhotosToRender

    setUploadPendingPhotos(uploadPending)
    setDownloadReadyPhotos(downloadReady)
    setPhotosForAlbumCreation(selectivePhotos)
    setNormalPhotos(props.photosToRender)

    if (selectedFilter === 'none') { setPhotosToRender(props.photosToRender) }
    if (selectedFilter === 'upload') { setPhotosToRender(uploadPending) }
    if (selectedFilter === 'download') { setPhotosToRender(downloadReady) }
  }, [props.photosToRender])

  // after a preview gets downloaded and saved to the db...
  useEffect(() => {
    if (props.isSavePhotosPreviewsDB) {
      getRepositoriesDB().then((res) => {
        props.dispatch(photoActions.viewDB())
        const currentPhotos = props.photosToRender
        const previews = res.previews.reduce((acc, preview) => ({ ...acc, [preview.hash]: preview }), {})

        Object.keys(previews).forEach(key => {
          // if there's already a photo with the same hash rendered
          if (currentPhotos[key]) {
            // update only if it's a local image
            if (currentPhotos[key].isLocal && !currentPhotos[key].isUploaded) {
              props.dispatch(photoActions.updatePhotoStatusUpload(key, true))
              props.dispatch(photoActions.updatePhotoStatus(key, true, true, undefined, previews[key].photoId))
            }
          }
          else {
            const prevObj = { [key]: previews[key] }

            props.dispatch(photoActions.addPhotosToRender(prevObj))
          }
        })
      })
    }
  }, [props.isSavePhotosPreviewsDB])

  useEffect(() => {
    if (props.isSaveAlbumsDB) {
      getAlbumsRepository().then(res => {
        const albumsWithPreviews = res.albumsWithPreviews.flatMap(x => x)
        const albums = res.albums.reduce((acc, album) => {
          acc[album.id] = {
            name: album.name,
            hashes: albumsWithPreviews.filter(preview => preview.albumId === album.id).map(preview => preview.hash)
          }
          return acc
        }, {})

        setAlbums(albums)
        setFilteredAlbums(albums)
      })
    }
  }, [props.isSaveAlbumsDB])

  useEffect(() => {
    if (!props.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.loggedIn])

  useEffect(() => {
    let count = 0
    // BackHandler
    const backAction = () => {
      if (selectedFilter !== 'none') { setSelectedFilter('none'); return true }
      if (headerTitle !== 'INTERNXT PHOTOS') {
        if (isAlbumSelected) { setIsAlbumSelected(false); return true }
        setHeaderTitle('INTERNXT PHOTOS')
        return true
      }
      if (props.showAlbumModal || props.showSelectPhotosModal) {
        props.dispatch(layoutActions.closeCreateAlbumModal())
        props.dispatch(layoutActions.closeSelectPhotosForAlbumModal())
        return true
      }

      count++
      if (count < 2) {
        SimpleToast.show('Try exiting again to close the app')
      } else {
        BackHandler.exitApp()
      }

      // Reset if some time passes
      setTimeout(() => {
        count = 0
      }, 4000)
      return true
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)

    return () => backHandler.remove()
  }, [selectedFilter, headerTitle, props.showAlbumModal, props.showSelectPhotosModal])

  useEffect(() => {
    if (!hasMoreLocals) {
      uploadPreviewsNull(nullablePreviews, props.photosToRender).then((res) => {
        syncPreviews(res, props.dispatch).then()
      })
    }
  }, [hasMoreLocals])

  const renderItemPhoto = useCallback(({ item }) => <Photo item={item} dispatch={props.dispatch} />, [])
  const keyExtractorPhoto = useCallback((item: IPhotoToRender) => item.hash, [])
  const getItemLayoutPhoto = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

  const renderItemAlbum = useCallback(({ item }) => <AlbumCard album={item} handleAlbumOnPress={handleAlbumOnPress} />, [albums])
  const keyExtractorAlbum = useCallback((item, index) => index, [albums])
  const getItemLayoutAlbum = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

  const EmptyPhotosToRenderList = (): JSX.Element => (
    <View>
      {
        selectedFilter === 'download' ?
          <Text style={tailwind('font-light text-center text-base')}>Here you can see the photos that you have uploaded to Internxt Photos but are no longer stored on your phone&apos;s gallery.</Text>
          :
          <Text style={tailwind('font-light text-center text-base')}>Here you can see the photos from your gallery that have not yet been uploaded to Internxt Photos.</Text>
      }
    </View>
  )

  return (
    <View style={tailwind('flex-1')}>
      <CreateAlbumModal
        showAlbumModal={props.showAlbumModal}
        albumTitle={albumTitle}
        setAlbumTitle={setAlbumTitle}
        dispatch={props.dispatch}
      />
      <SelectPhotosModal
        showSelectPhotosModal={props.showSelectPhotosModal}
        albumTitle={albumTitle}
        setAlbumTitle={setAlbumTitle}
        photos={photosForAlbumCreation}
        dispatch={props.dispatch}
      />
      <SettingsModal navigation={props.navigation} />

      <View style={tailwind('px-5')}>
        <SafeAreaView style={tailwind('h-full')}>
          <Header
            title={headerTitle}
            setHeaderTitle={setHeaderTitle}
            isSyncing={props.isSyncing}
            isAlbumSelected={isAlbumSelected}
            setIsAlbumSelected={setIsAlbumSelected}
            selectedFilter={selectedFilter}
            handleFilterSelection={handleFilterSelection}
            searchString={searchString}
            setSearchString={setSearchString}
            setAlbumTitle={setAlbumTitle}
          />

          {
            headerTitle === 'INTERNXT PHOTOS' ?
              <FlatList
                data={Object.values(photosToRender)}
                numColumns={3}
                keyExtractor={keyExtractorPhoto}
                renderItem={renderItemPhoto}
                getItemLayout={getItemLayoutPhoto}
                ListEmptyComponent={EmptyPhotosToRenderList}
                style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
              />
              :
              !isAlbumSelected ?
                <FlatList
                  data={Object.values(filteredAlbums)}
                  numColumns={3}
                  keyExtractor={keyExtractorAlbum}
                  renderItem={renderItemAlbum}
                  getItemLayout={getItemLayoutAlbum}
                  style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
                />
                :
                <FlatList
                  data={Object.values(albumPhotosToRender)}
                  numColumns={3}
                  keyExtractor={keyExtractorPhoto}
                  renderItem={renderItemPhoto}
                  getItemLayout={getItemLayoutPhoto}
                  style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
                />

          }

          <Footer
            setSelectedFilter={setSelectedFilter}
            headerTitle={headerTitle}
            setHeaderTitle={setHeaderTitle}
            setIsAlbumSelected={setIsAlbumSelected}
            dispatch={props.dispatch}
          />
        </SafeAreaView>
      </View>
    </View>
  );
}

const mapStateToProps = (state: IStoreReducers) => {
  return {
    isSyncing: state.photosState.isSyncing,
    loggedIn: state.authenticationState.loggedIn,
    isSavePhotosPreviewsDB: state.photosState.isSavePhotosPreviewsDB,
    photosToRender: state.photosState.photosToRender,
    showSelectPhotosModal: state.layoutState.showSelectPhotosModal,
    showAlbumModal: state.layoutState.showAlbumModal,
    isSaveAlbumsDB: state.photosState.isSaveAlbumsDB
  };
}

export default connect(mapStateToProps)(PhotoGallery)