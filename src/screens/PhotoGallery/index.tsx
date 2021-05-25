import React, { useState, useEffect } from 'react';
import { Dimensions, SafeAreaView, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getLocalImages, getPreviews, IHashedPhoto, initUser, stopSync, syncPhotos } from './init'
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
import HomeBlue from '../../../assets/icons/photos/home-blue.svg'
import FolderBlue from '../../../assets/icons/photos/folder-blue.svg'
import LensThinBlue from '../../../assets/icons/photos/lens-thin-blue.svg'
import Lens from '../../../assets/icons/photos/lens.svg';
import SquareWithCrossBlue from '../../../assets/icons/photos/square-with-cross-blue.svg'
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'
import { IStoreReducers } from '../../types/redux';
import { store } from '../../store';

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

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [searchString, setSearchString] = useState('')
  const [filteredPhotosToRender, setFilteredPhotosToRender] = useState<IPhotosToRender>(props.photosToRender)
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
      const newPhotos: IPhotosToRender = newNext20.reduce((acc, photo) => {
        return { ...acc, [photo.hash]: photo }
      }, {})
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
      }
    }

    await Promise.all(syncActions).finally(() => {
      props.dispatch(photoActions.stopSync())
    })
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

  // Array.prototype.filter version for Objects
  const objectFilter = (obj, predicate) => Object.fromEntries(Object.entries(obj).filter(predicate))
  const selectFilter = (filterName: string) => {
    selectedFilter === filterName ? setSelectedFilter('none') : setSelectedFilter(filterName)

    const currentPhotos = store.getState().photosState.photosToRender
    let newPhotosToRender

    switch (true) {
    case filterName === 'upload' && (selectedFilter === 'none' || selectedFilter === 'download' || selectedFilter === 'albums'):
      newPhotosToRender = objectFilter(currentPhotos, ([hash, value]) => !value.isUploaded && value.isLocal)
      return setFilteredPhotosToRender(newPhotosToRender)

    case filterName === 'download' && (selectedFilter === 'none' || selectedFilter === 'upload'):
      newPhotosToRender = objectFilter(currentPhotos, ([hash, value]) => value.isUploaded && !value.isLocal)
      return setFilteredPhotosToRender(newPhotosToRender)

      // if clicked on the same filter restore array
    case filterName === selectedFilter:
      return setFilteredPhotosToRender(currentPhotos)
    }
  }

  useEffect(() => {
    initUser().then(() => {
      getLocalPhotos()
      getPreviews(props.dispatch)
      getRepositories()
    })
  }, [])

  // update the data everytime a photo gets downloaded/synced
  useEffect(() => {
    if (selectedFilter === 'download') {
      const newFiltered = objectFilter(props.photosToRender, ([key, value]) => !value.isLocal && value.isUploaded) as IPhotosToRender

      setFilteredPhotosToRender(newFiltered)
    }

    if (selectedFilter === 'upload') {
      const newFiltered = objectFilter(props.photosToRender, ([key, value]) => value.isLocal && !value.isUploaded) as IPhotosToRender

      setFilteredPhotosToRender(newFiltered)
    }

    if (selectedFilter === 'none') {
      setFilteredPhotosToRender(props.photosToRender)
    }

  }, [props.photosToRender])

  // update/push photo on preview download
  useEffect(() => {
    if (props.isSaveDB) {
      getRepositoriesDB().then((res) => {
        props.dispatch(photoActions.viewDB())
        const currentPhotos = store.getState().photosState.photosToRender
        const previews = res.previews.reduce((acc, preview) => ({ ...acc, [preview.hash]: preview }), {})

        Object.keys(previews).forEach(key => {
          if (currentPhotos[key]) { props.dispatch(photoActions.updatePhotoStatus(key, true, true)) }
          else { props.dispatch(photoActions.addPhotosToRender(previews[key])) }
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

  return (
    <View style={tailwind('flex-1')}>
      <CreateAlbumModal />
      <SelectPhotosModal />

      <View style={tailwind('px-5')}>
        <SafeAreaView style={tailwind('h-full')}>
          <Header title={headerTitle} />

          {headerTitle === 'INTERNXT PHOTOS' ?
            <View style={tailwind('flex-row mt-3 items-center justify-center')}>
              <FilterButton width='w-1/3' corners='rounded-l' text='Download' filter='download' selectFilter={selectFilter} activeFilter={selectedFilter} />
              <FilterButton width='w-4/10' corners='' text='Upload pending' filter='upload' selectFilter={selectFilter} activeFilter={selectedFilter} />
              <FilterButton width='w-3/10' corners='rounded-r' text='Albums' filter='albums' selectFilter={selectFilter} activeFilter={selectedFilter} />
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
            headerTitle === 'INTERNXT PHOTOS' && Object.keys(props.photosToRender).length > 0 ?
              <FlatList
                data={Object.keys(filteredPhotosToRender)}
                numColumns={3}
                keyExtractor={item => item}
                renderItem={({ item }) => <Photo item={filteredPhotosToRender[item]} key={item} dispatch={props.dispatch} />}
                style={[tailwind('mt-3'), { height: DEVICE_HEIGHT * 0.8 }]}
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

          <View style={tailwind('flex-row h-12 justify-between items-center my-3 pl-2')}>
            <TouchableOpacity style={tailwind('w-10 h-10 items-center justify-center')}
              onPress={() => {
                setHeaderTitle('INTERNXT PHOTOS')
              }}
            >
              <HomeBlue width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={tailwind('w-10 h-10 items-center justify-center')}
              onPress={() => {
                setHeaderTitle('Albums')
              }}
            >
              <FolderBlue width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={tailwind('w-10 h-10 items-center justify-center')}
            >
              <LensThinBlue width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={tailwind('w-10 h-10 items-center justify-center')}
            >
              <SquareWithCrossBlue width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={tailwind('flex-row h-6 w-20 px-2 bg-blue-60 rounded-xl items-center justify-between')}
              onPress={() => props.dispatch(layoutActions.openCreateAlbumModal())}
            >
              <CrossWhite width={10} height={10} />
              <Text style={tailwind('text-white font-averta-regular text-sm')}>Album</Text>
            </TouchableOpacity>
          </View>
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