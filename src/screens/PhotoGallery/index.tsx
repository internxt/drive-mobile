import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, Text, View, StyleSheet, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import { Dispatch } from 'redux';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { WaveIndicator } from 'react-native-indicators';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import Photo from '../../components/PhotoList/Photo';
import { IPhotosToRender } from '../Photos';
import { PhotoActions } from '../../redux/actions';
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import UploadBlue from '../../../assets/icons/photos/upload-file-blue.svg'
import CloudDownload from '../../../assets/icons/photos/cloud-download-gray.svg'
import AlbumGray from '../../../assets/icons/photos/create-album-gray.svg'
import Filter from '../../../assets/icons/photos/open-filters.svg'
import Home from '../../../assets/icons/photos/home.svg'
import FolderBlue from '../../../assets/icons/photos/folder-blue.svg'
import SearchThinBlue from '../../../assets/icons/photos/search-thin-blue.svg'
import AddMoreBlue from '../../../assets/icons/photos/add-more-blue.svg'
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'

interface PhotoGalleryProps {
  navigation: any
  photosToRender: IPhotosToRender
  dispatch: Dispatch,
  isSyncing: boolean
}

const DEVICE_HEIGHT = Dimensions.get('window').height

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [downloadedPhoto, setDownloadedPhoto] = useState<any>()

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
    <View style={tailwind('flex-1 px-5')}>
      <SafeAreaView>
        <AlbumDetailsModal />
        <AddItemToModal />

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
                <UploadBlue width={20} height={15} />
              </View>

              <View style={tailwind('bg-white h-6 w-6 rounded-sm items-center justify-center ml-1')}>
                <Filter width={20} height={13} />
              </View>
            </View>
          </View>

          <View style={tailwind('flex-row h-6 mt-1')}>
            <View style={tailwind('flex-row w-1/3 bg-white rounded-l-md items-center justify-center')}>
              <CloudDownload width={15} height={15} />
              <Text style={tailwind('text-xs text-gray-80 font-averta-light ml-2')}>Download</Text>
            </View>

            <View style={tailwind('flex-row w-1/3 bg-white items-center justify-center ml-px mr-px')}>
              <UploadBlue width={15} height={15} />
              <Text style={tailwind('text-xs text-blue-60 font-averta-light ml-2')}>Upload pending</Text>
            </View>

            <View style={tailwind('flex-row w-1/3 bg-white rounded-r-md items-center justify-center')}>
              <AlbumGray width={15} height={14} />
              <Text style={tailwind('text-xs text-gray-80 font-averta-light ml-1')}>Album</Text>
            </View>
          </View>
        </View>

        {
          photosToRender.length ?
            <FlatList
              data={photosToRender}
              numColumns={3}
              keyExtractor={item => item.hash}
              renderItem={({ item }) => <Photo item={item} key={item.hash} pushDownloadedPhoto={pushDownloadedPhoto} />}
              style={[tailwind('mt-2'), { height: DEVICE_HEIGHT * 0.78 }]}
            />
            :
            <WaveIndicator color="#5291ff" size={50} />
        }

        <View style={tailwind('flex-row h-12 justify-between mt-6 pl-2')}>
          <Home width={20} height={20} />
          <FolderBlue width={20} height={20} />
          <SearchThinBlue width={20} height={20} />
          <AddMoreBlue width={20} height={20} />

          <TouchableOpacity style={tailwind('flex-row h-6 w-20 px-2 bg-blue-60 rounded-xl items-center justify-around')}>
            <CrossWhite width={12} height={12} />
            <Text style={tailwind('text-white font-averta-regular text-sm')}>Album</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({

})

const mapStateToProps = (state: any) => {
  return {
    photosToRender: state.photosState.photosToRender,
    isSyncing: state.photosState.isSyncing
  };
};

export default connect(mapStateToProps)(PhotoGallery);