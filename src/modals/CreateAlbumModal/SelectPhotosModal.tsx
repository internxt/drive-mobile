import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { IImageInfo } from 'react-native-image-zoom-viewer/built/image-viewer.type';
import Modal from 'react-native-modalbox';
import { tailwind } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import Photo from '../../components/PhotoList/Photo';
import { IStoreReducers } from '../../types/redux';
import { IPhotosToRender } from '../../screens/PhotoGallery';
import { uploadAlbum } from './init';
import SimpleToast from 'react-native-simple-toast';

interface SelectPhotosModalProps {
  dispatch: any
  showSelectPhotosModal: boolean
  token: string
  user: any
  photos: IPhotosToRender
  albumTitle: string
}

export interface IAlbum {
  title: string
  createdAt?: string
  updatedAt?: string
  id?: number
  name?: string
  photos: IAlbumPhoto[]
  userId?: string
}

export interface IAlbumPhoto {
  bucketId: string
  fileId: string
  id: number
  userId: number
  createdAt: string
  updatedAt: string
  name: string
  hash: string
  size: number
  type: string
  photosalbums: any
  localUri?: string
}

function SelectPhotosModal(props: SelectPhotosModalProps): JSX.Element {
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<IImageInfo[]>([])
  const [isOpen, setIsOpen] = useState(props.showSelectPhotosModal)

  useEffect(() => {
    setIsOpen(props.showSelectPhotosModal)
  }, [props.showSelectPhotosModal])

  const handleSelection = (selectedPhotoId: number) => {
    const currentSelectedPhotos = selectedPhotos.slice()
    const isAlreadySelected = currentSelectedPhotos.find(photoId => photoId === selectedPhotoId)

    if (isAlreadySelected) {
      const newSelectedPhotos = currentSelectedPhotos.filter(photoId => photoId === selectedPhotoId ? null : photoId)

      setSelectedPhotos(newSelectedPhotos)

    } else {
      currentSelectedPhotos.push(selectedPhotoId)
      setSelectedPhotos(currentSelectedPhotos)
    }
  }

  const handleAlbumCreation = () => {
    if (selectedPhotos.length > 0) {
      setIsCreatingAlbum(true)
      uploadAlbum(props.albumTitle, selectedPhotos)
        .catch(() => SimpleToast.show('Could not create album'))
        .finally(() => setIsCreatingAlbum(false))
    } else {
      SimpleToast.show('You need to select at least one photo')
    }
  }

  const closeModal = () => {
    props.dispatch(layoutActions.closeSelectPhotosForAlbumModal())
    setIsOpen(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      position='bottom'
      swipeArea={40}
      style={tailwind('h-9/10 rounded-t-3xl px-5')}
      onClosed={() => closeModal()}
    >
      <View style={tailwind('self-center bg-blue-60 rounded h-1 w-24 mt-5')} />

      <Text style={tailwind('text-center text-sm font-averta-regular text-gray-50 mt-5')}>Add photos to {props.albumTitle}</Text>

      <View style={tailwind('flex-row justify-between mt-5')}>
        <TouchableOpacity onPress={closeModal} disabled={isCreatingAlbum}>
          <Text style={!isCreatingAlbum ? tailwind('text-blue-60 font-averta-regular text-base') : tailwind('text-blue-40 font-averta-regular text-base')}>Cancel</Text>
        </TouchableOpacity>

        <Text style={tailwind('text-gray-70 font-averta-regular text-base')}>All photos</Text>

        <TouchableOpacity onPress={handleAlbumCreation}>
          <Text style={!isCreatingAlbum ? tailwind('text-blue-60 font-averta-regular text-base') : tailwind('text-blue-40 font-averta-regular text-base')}>Done</Text>
        </TouchableOpacity>
      </View>

      {
        Object.keys(props.photos).length > 0 ?
          <FlatList
            data={Object.keys(props.photos)}
            numColumns={3}
            keyExtractor={item => item}
            renderItem={({ item }) => <Photo item={props.photos[item]} key={item} photoSelection={true} handleSelection={handleSelection} />}
            style={tailwind('h-8/10 mt-2 mb-8')}
          />
          :
          null
      }
    </Modal>
  );
}

const mapStateToProps = (state: IStoreReducers) => {
  return {
    showSelectPhotosModal: state.layoutState.showSelectPhotosModal,
    token: state.authenticationState.token,
    user: state.authenticationState.user
  }
};

export default connect(mapStateToProps)(SelectPhotosModal);