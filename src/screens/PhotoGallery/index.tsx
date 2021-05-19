import React, { useState, useEffect } from 'react';
import { Dimensions, SafeAreaView, Text, View } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import { getLocalImages, getPreviews, IHashedPhoto, initUser, LocalImages, stopSync, syncPhotos } from './init'
import { FlatList, TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { getRepositoriesDB } from '../../database/DBUtils.ts/utils';
import { Previews } from '../../database/models/previews';
import { layoutActions, PhotoActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
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

export const DEVICE_WIDTH = Dimensions.get('window').width
export const DEVICE_HEIGHT = Dimensions.get('window').height

function PhotoGallery(props: IPhotoGalleryProps): JSX.Element {
  const [photosToRender, setPhotosToRender] = useState<any[]>([])
  const [uploadedPreviews, setUploadedPreviews] = useState<Previews[]>([])
  const [filteredPhotosToRender, setFilteredPhotosToRender] = useState<any[]>([])
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [searchString, setSearchString] = useState('')

  const syncQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  const getLocalPhotos = async () => {
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

      syncActions.push(syncAction())

      photos = (photos.length > 0 ? photos.concat(res.assets) : res.assets).map(photo => ({ ...photo, isLocal: true, isUploaded: false }))
      const payload: IPhotosToRender = { photos, hasNextPage: res.hasNextPage }

      props.dispatch(PhotoActions.setPhotosToRender(payload))

      if (res.hasNextPage) {
        lastPickedImage = res.endCursor
      } else {
        finished = true
      }
    }

    await Promise.all(syncActions).then(() => {
      props.dispatch(PhotoActions.stopSync())
    })
  }

  useEffect(() => {
    initUser().then(() => {
      getLocalPhotos()
      getPreviews(props.dispatch)
      startGettingRepositories()
    })
  }, [])

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

  const selectFilter = (filterName: string) => {
    selectedFilter === filterName ? setSelectedFilter('none') : setSelectedFilter(filterName)

    const photos = photosToRender.slice()
    let newPhotosToRender

    switch (true) {
    case filterName === 'upload' && (selectedFilter === 'none' || selectedFilter === 'download'):
      newPhotosToRender = photos.filter(photo => !photo.isUploaded && photo.isLocal)

      return setFilteredPhotosToRender(newPhotosToRender)

    case filterName === 'download' && (selectedFilter === 'none' || selectedFilter === 'upload'):
      newPhotosToRender = photos.filter(photo => photo.isUploaded && !photo.isLocal)

      return setFilteredPhotosToRender(newPhotosToRender)

      // if clicked on the same filter restore array
    case filterName === selectedFilter:
      return setFilteredPhotosToRender(photos)
    }
  }

  const pushDownloadedPhoto = (photo: IHashedPhoto) => props.dispatch(PhotoActions.pushDownloadedPhoto(photo))

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
  }, [uploadedPreviews])

  useEffect(() => {
    const currentPhotos = photosToRender.slice()
    const newPhotos = props.photosToRender.photos

    newPhotos.forEach(newPhoto => {
      const index = currentPhotos.findIndex(currPhoto => currPhoto.hash === newPhoto.hash)

      if (index === -1) {
        currentPhotos.push(newPhoto)
      } else {
        if (currentPhotos[index].isUploaded && !currentPhotos[index].isLocal) {
          currentPhotos[index] = { ...newPhoto, isLocal: true, isUploaded: true }
        }
      }
    })
    setPhotosToRender(currentPhotos)
  }, [props.photosToRender.photos])

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
            headerTitle === 'INTERNXT PHOTOS' && photosToRender.length ?
              <FlatList
                data={photosToRender}
                numColumns={3}
                keyExtractor={item => item.hash}
                renderItem={({ item }) => <Photo item={item} key={item.hash} pushDownloadedPhoto={pushDownloadedPhoto} />}
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

const mapStateToProps = (state: any) => {
  return {
    isSyncing: state.photosState.isSyncing,
    loggedIn: state.authenticationState.loggedIn,
    isSaveDB: state.photosState.isSaveDB,
    photosToRender: state.photosState.photosToRender
  };
}

export default connect(mapStateToProps)(PhotoGallery)