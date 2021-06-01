import React, { useState, useEffect, useCallback } from 'react';
import { Dimensions, SafeAreaView, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getLocalImages, getNullPreviews, getPreviews, IHashedPhoto, initUser, stopSync, syncPhotos, syncPreviews } from './init'
import { FlatList, TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { getRepositoriesDB } from '../../database/DBUtils.ts/utils';
import { layoutActions, photoActions } from '../../redux/actions';
import { queue } from 'async';
import Photo from '../../components/PhotoList/Photo';
import Header from './Header';
import CreateAlbumModal from '../../modals/CreateAlbumModal';
import SelectPhotosModal from '../../modals/CreateAlbumModal/SelectPhotosModal';
import FilterButton from './FilterButton';
import { tailwind, getColor } from '../../tailwind.js'
import AlbumCard from '../../components/AlbumCard';
import Lens from '../../../assets/icons/photos/lens.svg';
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'
import { IStoreReducers } from '../../types/redux';
import { store } from '../../store';
import { getAlbums } from '../../modals/CreateAlbumModal/init';
import Footer from './Footer';
import SettingsModal from '../../modals/SettingsModal';

interface IPhotoGalleryProps {
  route: any;
  navigation: any
  dispatch: Dispatch,
  loggedIn: boolean
  isSyncing: boolean
  isSaveDB: boolean
  photosToRender: IPhotosToRender
}

export interface IPhotosToRender {
  [hash: string]: IPhotoToRender
}

export interface IPhotoToRender extends IHashedPhoto {
  isLocal: boolean,
  isUploaded: boolean,
  isDownloading: boolean,
  isUploading: boolean
}

export const DEVICE_WIDTH = Dimensions.get('window').width
export const DEVICE_HEIGHT = Dimensions.get('window').height

export const objectFilter = (obj, predicate) => Object.fromEntries(Object.entries(obj).filter(predicate))
export const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([key, value], i) => [key, fn(value, key, i)]))

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [albumTitle, setAlbumTitle] = useState('')
  const [searchString, setSearchString] = useState('')
  const [downloadReadyPhotos, setDownloadReadyPhotos] = useState<IPhotosToRender>({})
  const [uploadPendingPhotos, setUploadPendingPhotos] = useState<IPhotosToRender>({})
  const [normalPhotos, setNormalPhotos] = useState<IPhotosToRender>(props.photosToRender)
  const [photosToRender, setPhotosToRender] = useState<IPhotosToRender>(props.photosToRender)
  const [photosForAlbumCreation, setPhotosForAlbumCreation] = useState<IPhotosToRender>({})
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

      const newNext20 = localPhotos.assets.map(photo => ({ ...photo, isLocal: true, isUploaded: false, isDownloading: false, isUploading: false }))
      const newPhotos: IPhotosToRender = newNext20.reduce((acc, photo) => ({ ...acc, [photo.hash]: photo }), {})
      const currentPhotos: IPhotosToRender = store.getState().photosState.photosToRender

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
      const currentPhotos: IPhotosToRender = store.getState().photosState.photosToRender
      const previews = res.previews.reduce((acc, preview) => ({ ...acc, [preview.hash]: preview }), {})

      Object.keys(previews).forEach(key => {
        if (currentPhotos[key]) {
          if (currentPhotos[key].isLocal && !currentPhotos[key].isUploaded) { // este if sobra?
            props.dispatch(photoActions.updatePhotoStatus(key, true, true))
          }
        } else {
          const previewObj = { [key]: previews[key] }

          props.dispatch(photoActions.addPhotosToRender(previewObj))
        }
      })

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

  useEffect(() => {
    if (finishLocals) {
      uploadPreviewsNull(nullablePreviews, props.photosToRender).then((res) => {
        syncPreviews(res, props.dispatch).then()
      })
    }
  }, [finishLocals])

  useEffect(() => {
    initUser().then(() => {
      getLocalPhotos()
      getPreviews(props.dispatch)
      getAlbums()
      getRepositories()
      getNullPreviews().then((res) => {
        setNullablePreviews(res)
      })
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
    if (props.isSaveDB) {
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
              props.dispatch(photoActions.updatePhotoStatus(key, true, true))
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
  }, [props.isSaveDB])

  useEffect(() => {
    if (!props.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.loggedIn])

  const renderItem = useCallback(({ item }) => <Photo item={item} dispatch={props.dispatch} />, [])
  const keyExtractor = useCallback((item: IPhotoToRender) => item.hash, [])
  const getItemLayout = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

  return (
    <View style={tailwind('flex-1')}>
      <CreateAlbumModal albumTitle={albumTitle} setAlbumTitle={setAlbumTitle} />
      <SelectPhotosModal albumTitle={albumTitle} photos={photosForAlbumCreation} />
      <SettingsModal navigation={props.navigation} />

      <View style={tailwind('px-5')}>
        <SafeAreaView style={tailwind('h-full')}>
          <Header isSyncing={props.isSyncing} title={headerTitle} />

          {headerTitle === 'INTERNXT PHOTOS' ?
            <View style={tailwind('flex-row mt-3 items-center justify-center')}>
              <FilterButton width='w-1/3' corners='rounded-l' text='Download' filter='download' handleFilterSelection={handleFilterSelection} activeFilter={selectedFilter} />
              <FilterButton width='w-4/10' corners='' text='Upload pending' filter='upload' handleFilterSelection={handleFilterSelection} activeFilter={selectedFilter} />
              <FilterButton width='w-3/10'
                corners='rounded-r'
                text='Albums'
                filter='albums'
                activeFilter={selectedFilter}
                onPress={handleOnPressFilter}
              />
            </View>
            :
            <View style={tailwind('flex-row mt-3 items-center justify-center')}>
              <View style={tailwind('w-1/10 h-8 items-center justify-center bg-white rounded-l-md')}>
                <Lens width={19} height={19} />
              </View>

              <View style={tailwind('w-7/12 h-8 ml-px mr-1')}>
                <TextInput
                  style={tailwind('w-full h-full bg-white text-sm font-averta-regular pl-2 pb-1')}
                  placeholderTextColor={getColor('gray-30')}
                  placeholder='Search a memory'
                  onChangeText={value => setSearchString(value)}
                  value={searchString}
                  autoCapitalize='none'
                  autoCorrect={false}
                />
              </View>

              <View style={tailwind('w-1/3')}>
                <TouchableOpacity style={tailwind('flex-row h-8 px-2 bg-blue-60 rounded-r-md items-center justify-around')}
                  onPress={() => props.dispatch(layoutActions.openCreateAlbumModal())}
                >
                  <CrossWhite width={10} height={10} />
                  <Text style={tailwind('text-white font-averta-regular text-sm')}>Add album</Text>
                </TouchableOpacity>
              </View>
            </View>
          }

          {
            headerTitle === 'INTERNXT PHOTOS' && Object.values(props.photosToRender).length > 0 ?
              <FlatList
                data={Object.values(photosToRender)}
                numColumns={3}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
                //maxToRenderPerBatch={48} // CHECK THIS PROPERLY
                windowSize={21} // CHECK THIS PROPERLY
              />
              :
              <FlatList
                data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11, 12, 13, 14, 15, 16, 17]}
                numColumns={3}
                //keyExtractor={item => item.hash}
                renderItem={({ item }) => <AlbumCard item={item} key={item} />}
                style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
              />
          }

          <Footer setSelectedFilter={setSelectedFilter} setHeaderTitle={setHeaderTitle} dispatch={props.dispatch} />
        </SafeAreaView>
      </View>
    </View>
  );
}

const mapStateToProps = (state: IStoreReducers) => {
  return {
    isSyncing: state.photosState.isSyncing,
    loggedIn: state.authenticationState.loggedIn,
    isSaveDB: state.photosState.isSaveDB,
    photosToRender: state.photosState.photosToRender
  };
}

export default connect(mapStateToProps)(PhotoGallery)