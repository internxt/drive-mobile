import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, Text, View, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { WaveIndicator } from 'react-native-indicators';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import Photo from '../../components/PhotoList/Photo';
import { IPhotosToRender } from '../Photos';
import { layoutActions, PhotoActions } from '../../redux/actions';
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import CloudUploadBlue from '../../../assets/icons/photos/cloud-upload-blue.svg'
import CloudUploadGray from '../../../assets/icons/photos/cloud-upload-gray.svg'
import CloudDownloadBlue from '../../../assets/icons/photos/cloud-download-blue.svg'
import CloudDownloadGray from '../../../assets/icons/photos/cloud-download-gray.svg'
import FolderWithCrossBlue from '../../../assets/icons/photos/folder-with-cross-blue.svg'
import FolderWithCrossGray from '../../../assets/icons/photos/folder-with-cross-gray.svg'
import TwoDotsBlue from '../../../assets/icons/photos/two-dots-blue.svg'
import HomeBlue from '../../../assets/icons/photos/home-blue.svg'
import FolderBlue from '../../../assets/icons/photos/folder-blue.svg'
import LensThinBlue from '../../../assets/icons/photos/lens-thin-blue.svg'
import SquareWithCrossBlue from '../../../assets/icons/photos/square-with-cross-blue.svg'
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'
import CreateAlbumModal from '../../modals/CreateAlbumModal';
import SelectPhotosModal from '../../modals/CreateAlbumModal/SelectPhotosModal';

interface PhotoGalleryProps {
  navigation: any
  photosToRender: IPhotosToRender
  dispatch: any,
  isSyncing: boolean
}

const DEVICE_HEIGHT = Dimensions.get('window').height

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [filteredPhotosToRender, setFilteredPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [downloadedPhoto, setDownloadedPhoto] = useState<any>()
  const [selectedFilter, setSelectedFilter] = useState('none')

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
          <View style={tailwind('flex-col')}>
            <View style={tailwind('flex-row')}>
              <View style={tailwind('w-1/5')}></View>

              <Text style={tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular')}>
                {strings.screens.photos.screens.photo_gallery.title}
              </Text>

              <View style={tailwind('flex-row w-1/5 justify-end')}>
                <View style={tailwind('items-center justify-center mb-1')}>
                  <Syncing width={17} height={17} />
                </View>

                <View style={tailwind('bg-white h-6 w-6 rounded-sm items-center justify-center ml-2')}>
                  <CloudUploadBlue width={20} height={15} />
                </View>

                <View style={tailwind('bg-white h-6 w-6 rounded-sm items-center justify-center ml-1')}>
                  <TwoDotsBlue width={20} height={13} />
                </View>
              </View>
            </View>

            <View style={tailwind('flex-row h-6 mt-1 items-center justify-center')}>
              {selectedFilter === 'download' ?
                <View style={tailwind('w-1/3')}>
                  <TouchableOpacity style={tailwind('flex-row rounded-l bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('download')}
                  >
                    <CloudDownloadBlue width={15} height={15} />
                    <Text style={tailwind('text-xs text-blue-60 font-averta-light ml-2')}>Download</Text>
                  </TouchableOpacity>
                </View>
                :
                <View style={tailwind('w-1/3')}>
                  <TouchableOpacity style={tailwind('flex-row rounded-l bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('download')}
                  >
                    <CloudDownloadGray width={15} height={15} />
                    <Text style={tailwind('text-xs text-gray-80 font-averta-light ml-2')}>Download</Text>
                  </TouchableOpacity>
                </View>
              }

              {selectedFilter === 'upload' ?
                <View style={tailwind('w-4/10')}>
                  <TouchableOpacity style={tailwind('flex-row bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('upload')}
                  >
                    <CloudUploadBlue width={15} height={15} />
                    <Text style={tailwind('text-xs text-blue-60 font-averta-light ml-2')}>Upload pending</Text>
                  </TouchableOpacity>
                </View>
                :
                <View style={tailwind('w-4/10')}>
                  <TouchableOpacity style={tailwind('flex-row bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('upload')}
                  >
                    <CloudUploadGray width={15} height={15} />
                    <Text style={tailwind('text-xs text-gray-80 font-averta-light ml-2')}>Upload pending</Text>
                  </TouchableOpacity>
                </View>
              }

              {selectedFilter === 'albums' ?
                <View style={tailwind('w-1/4')}>
                  <TouchableOpacity style={tailwind('flex-row rounded-r bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('albums')}
                  >
                    <FolderWithCrossBlue width={15} height={14} />
                    <Text style={tailwind('text-xs text-blue-60 font-averta-light ml-2')}>Album</Text>
                  </TouchableOpacity>
                </View>
                :
                <View style={tailwind('w-1/4')}>
                  <TouchableOpacity style={tailwind('flex-row rounded-r bg-white items-center justify-center ml-px mr-px')}
                    onPress={() => selectFilter('albums')}
                  >
                    <FolderWithCrossGray width={15} height={14} />
                    <Text style={tailwind('text-xs text-gray-80 font-averta-light ml-2')}>Album</Text>
                  </TouchableOpacity>
                </View>
              }
            </View>
          </View>

          {
            photosToRender.length ?
              <FlatList
                data={filteredPhotosToRender}
                numColumns={3}
                keyExtractor={item => item.hash}
                renderItem={({ item }) => <Photo item={item} key={item.hash} pushDownloadedPhoto={pushDownloadedPhoto} />}
                style={[tailwind('mt-2'), { height: DEVICE_HEIGHT * 0.8 }]}
              />
              :
              <WaveIndicator color="#5291ff" size={50} />
          }

          <View style={tailwind('flex-row h-12 justify-between items-center mt-6 pl-2')}>
            <HomeBlue width={20} height={20} />
            <FolderBlue width={20} height={20} />
            <LensThinBlue width={20} height={20} />
            <SquareWithCrossBlue width={20} height={20} />

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