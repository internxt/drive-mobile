import React, { useState, useEffect, useCallback } from 'react';
import { BackHandler, Dimensions, RefreshControl, SafeAreaView, View, FlatList } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getLocalImages, getNullPreviews, getPreviews, IHashedPhoto, initUser, stopSync, syncPhotos, syncPreviews } from './init'
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
import { store } from '../../store';
import { getAlbums } from '../../modals/CreateAlbumModal/init';
import Footer from './Footer';
import SettingsModal from '../../modals/SettingsModal';
import SimpleToast from 'react-native-simple-toast';
import { WaveIndicator } from 'react-native-indicators';

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

export const DEVICE_WIDTH = Dimensions.get('window').width
export const DEVICE_HEIGHT = Dimensions.get('window').height

export const objectFilter = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).filter(fn))
export const objectMap = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).map(([key, value], i) => [key, fn(value, key, i)]))

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [albumTitle, setAlbumTitle] = useState('')
  const [searchString, setSearchString] = useState('')
  const [downloadReadyPhotos, setDownloadReadyPhotos] = useState<IPhotosToRender>({})
  const [uploadPendingPhotos, setUploadPendingPhotos] = useState<IPhotosToRender>({})
  const [normalPhotos, setNormalPhotos] = useState<IPhotosToRender>(props.photosToRender)
  const [photosToRender, setPhotosToRender] = useState<IPhotosToRender>(props.photosToRender)
  const [isLoading, setIsLoading] = useState(false)

  const [albums, setAlbums] = useState<IAlbumsToRender>({})
  const [filteredAlbums, setFilteredAlbums] = useState<IAlbumsToRender>({})
  const [photosForAlbumCreation, setPhotosForAlbumCreation] = useState<IPhotosToRender>({})
  const [isAlbumSelected, setIsAlbumSelected] = useState(false)
  const [albumPhotosToRender, setAlbumPhotosToRender] = useState<IPhotosToRender>({})

  const [finishLocals, setFinishLocals] = useState<boolean>(false)
  const [nullablePreviews, setNullablePreviews] = useState<any>([])
  const syncQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  const getLocalPhotos = async () => {
    let finished = false
    let lastPickedImage: string | undefined = undefined
    const syncActions: Promise<unknown>[] = []

    while (!finished) {
      const localPhotos = await getLocalImages(lastPickedImage)

      props.dispatch(photoActions.startSync())
      const syncAction = () => new Promise<unknown>(resolved => {
        syncQueue.push(() => syncPhotos(localPhotos.assets, props.dispatch), resolved)
      })

      syncActions.push(syncAction())

      const newNext20 = localPhotos.assets.map(photo => ({
        ...photo,
        isLocal: true,
        isUploaded: false,
        isDownloading: false,
        isUploading: false,
        isSelected: false
      }))
      const newPhotos: IPhotosToRender = newNext20.reduce((acc, photo) => ({ ...acc, [photo.hash]: photo }), {})
      const currentPhotos: IPhotosToRender = store.getState().photosState.photosToRender

      Object.keys(newPhotos).forEach(key => {
        if (currentPhotos[key]) {
          if (!currentPhotos[key].isLocal && currentPhotos[key].isUploaded) {
            const pathToLocalImage = newPhotos[key].localUri

            props.dispatch(photoActions.updatePhotoStatus(key, true, true, pathToLocalImage))
            setIsLoading(false)
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
        setFinishLocals(true)
      }
    }

    await Promise.all(syncActions).finally(() => {
      props.dispatch(photoActions.stopSync())
    })
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

  const getRepositories = async () => {
    await getRepositoriesDB().then((res) => {
      props.dispatch(photoActions.viewDB())
      props.dispatch(photoActions.viewAlbumsDB())
      const currentPhotos: IPhotosToRender = store.getState().photosState.photosToRender
      const previews: IPhotosToRender = res.previews.reduce((acc, preview) => ({ ...acc, [preview.hash]: preview }), {})

      Object.keys(previews).forEach(key => {
        if (currentPhotos[key]) {
          if (currentPhotos[key].isLocal && !currentPhotos[key].isUploaded) { // este if sobra?
            props.dispatch(photoActions.updatePhotoStatus(key, true, true, undefined, previews[key].photoId))
          }
        } else {
          const previewObj = { [key]: previews[key] }

          props.dispatch(photoActions.addPhotosToRender(previewObj))
        }
      })

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

  const handleOnPressFilter = () => {
    setAlbumTitle('')
    props.dispatch(layoutActions.openCreateAlbumModal())
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

  const start = () => {
    getLocalPhotos()
    getPreviews(props.dispatch)
    getAlbums(props.dispatch)
    getRepositories()
    getNullPreviews().then((res) => {
      setNullablePreviews(res)
    })
  }

  useEffect(() => {
    const newFilteredAlbums = objectFilter(albums, ([key, album]) => album.name.search(searchString) !== -1)

    setFilteredAlbums(newFilteredAlbums)
  }, [searchString])

  useEffect(() => {
    initUser().then(() => {
      start()
    })
  }, [])

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
        const currentPhotos = store.getState().photosState.photosToRender
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
            const prevObj = {
              [key]: previews[key]
            }

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
    if (finishLocals) {
      uploadPreviewsNull(nullablePreviews, props.photosToRender).then((res) => {
        syncPreviews(res, props.dispatch).then()
      })
    }
  }, [finishLocals])

  const renderItemPhoto = useCallback(({ item }) => <Photo item={item} dispatch={props.dispatch} />, [])
  const keyExtractorPhoto = useCallback((item: IPhotoToRender) => item.hash, [])
  const getItemLayoutPhoto = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

  const renderItemAlbum = useCallback(({ item }) => <AlbumCard album={item} handleAlbumOnPress={handleAlbumOnPress} />, [albums])
  const keyExtractorAlbum = useCallback((item, index) => index, [albums])
  const getItemLayoutAlbum = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

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
            dispatch={props.dispatch}
            title={headerTitle}
            isSyncing={props.isSyncing}
            isAlbumSelected={isAlbumSelected}
            setIsAlbumSelected={setIsAlbumSelected}
            selectedFilter={selectedFilter}
            handleOnPressFilter={handleOnPressFilter}
            handleFilterSelection={handleFilterSelection}
            searchString={searchString}
            setSearchString={setSearchString}
            setAlbumTitle={setAlbumTitle}
          />

          {
            !isLoading ?
              headerTitle === 'INTERNXT PHOTOS' ?
                <FlatList
                  data={Object.values(photosToRender)}
                  numColumns={3}
                  keyExtractor={keyExtractorPhoto}
                  renderItem={renderItemPhoto}
                  getItemLayout={getItemLayoutPhoto}
                  style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
                  //maxToRenderPerBatch={48} // CHECK THIS PROPERLY
                  windowSize={21} // CHECK THIS PROPERLY
                  refreshControl={
                    <RefreshControl
                      refreshing={false}
                      onRefresh={() => {
                        setIsLoading(true)
                        props.dispatch(photoActions.clearPhotosToRender())
                        start()
                      }}
                    />
                  }
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
              :
              <WaveIndicator color="#5291ff" size={50} />
          }

          <Footer setSelectedFilter={setSelectedFilter} setHeaderTitle={setHeaderTitle} setIsAlbumSelected={setIsAlbumSelected} dispatch={props.dispatch} />
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