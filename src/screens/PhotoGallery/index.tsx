import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, Text, View, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import Photo from '../../components/PhotoList/Photo';
import { IPhotosToRender } from '../Photos';
import { layoutActions, PhotoActions } from '../../redux/actions';
import { tailwind, getColor } from '../../tailwind'
import HomeBlue from '../../../assets/icons/photos/home-blue.svg'
import FolderBlue from '../../../assets/icons/photos/folder-blue.svg'
import LensThinBlue from '../../../assets/icons/photos/lens-thin-blue.svg'
import Lens from '../../../assets/icons/photos/lens.svg';
import SquareWithCrossBlue from '../../../assets/icons/photos/square-with-cross-blue.svg'
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'
import CreateAlbumModal from '../../modals/CreateAlbumModal';
import SelectPhotosModal from '../../modals/CreateAlbumModal/SelectPhotosModal';
import FilterButton from './FilterButton';
import Header from './Header';
import AlbumCard from '../../components/AlbumCard';

interface PhotoGalleryProps {
  navigation: any
  photosToRender: IPhotosToRender
  dispatch: any,
  isSyncing: boolean
}

export const DEVICE_WIDTH = Dimensions.get('window').width
export const DEVICE_HEIGHT = Dimensions.get('window').height

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [filteredPhotosToRender, setFilteredPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [downloadedPhoto, setDownloadedPhoto] = useState<any>()
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [headerTitle, setHeaderTitle] = useState('INTERNXT PHOTOS')
  const [searchString, setSearchString] = useState('')

  const loadUploadedPhotos = async () => {
    let finished = false
    let offset = 0
    let lastIndex = 0

    while (!finished) {
      const previews = await getPreviews(setDownloadedPhoto, lastIndex)

      lastIndex = offset + previews.length

      if (lastIndex <= offset) {
        finished = true
      } else {
        offset = lastIndex
      }
    }
  }

  const pushDownloadedPhoto = (photo: IHashedPhoto) => props.dispatch(PhotoActions.pushDownloadedPhoto(photo))

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

  useEffect(() => {
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
    setFilteredPhotosToRender(currentPhotos)
  }, [props.photosToRender.photos])

  useEffect(() => {
    if (downloadedPhoto) {
      const index = photosToRender.findIndex(local => local.hash === downloadedPhoto.hash)

      if (index === -1) {
        const photo = { ...downloadedPhoto, isLocal: false }

        setPhotosToRender(currentPhotos => [...currentPhotos, photo])
      } else {
        const items = photosToRender.slice()

        items[index].isUploaded = true
        setPhotosToRender(items)
      }
    }
  }, [downloadedPhoto])

  useEffect(() => {
    loadUploadedPhotos()
  }, [])

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
                data={filteredPhotosToRender}
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
    photosToRender: state.photosState.photosToRender,
    isSyncing: state.photosState.isSyncing
  };
};

export default connect(mapStateToProps)(PhotoGallery);