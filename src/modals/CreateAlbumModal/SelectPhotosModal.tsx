import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import Modal from 'react-native-modalbox';
import { tailwind } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import Photo from '../../components/PhotoList/Photo';
import { IStoreReducers } from '../../types/redux';
import { DEVICE_WIDTH, IPhotosToRender, IPhotoToRender } from '../../screens/PhotoGallery';
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
  const [isOpen, setIsOpen] = useState(props.showSelectPhotosModal)

  useEffect(() => {
    setIsOpen(props.showSelectPhotosModal)
  }, [props.showSelectPhotosModal])

  const handleSelection = (selectedPhotoId: number) => {
    const currentIds = selectedPhotos.slice()
    const exists = currentIds.find(id => id === selectedPhotoId)

    if (exists) {
      //const newSelectedPhotos = currentSelectedPhotos.filter(photoId => photoId === selectedPhotoId ? null : photoId)
      setSelectedPhotos(prevIds => prevIds.filter(id => id !== selectedPhotoId))
    } else {
      setSelectedPhotos(prevIds => [...prevIds, selectedPhotoId])
    }
  }

  const handleAlbumCreation = () => {
    if (selectedPhotos.length > 0) {
      setIsCreatingAlbum(true)

      uploadAlbum(props.albumTitle, selectedPhotos).then(() =>
        SimpleToast.show('Album saved successfully')
      ).catch((err) => {
        if (err.status === 409) {
          return SimpleToast.show('An album with the same name already exists')
        }
        return SimpleToast.show('Could not create album')

      }).finally(() => setTimeout(() => setIsCreatingAlbum(false), 3000))
    } else {
      SimpleToast.show('You need to select at least one photo')
    }
  }

  const closeModal = () => {
    props.dispatch(layoutActions.closeSelectPhotosForAlbumModal())
    setIsOpen(false)
  }

  const renderItem = useCallback(({ item }) => <Photo item={item} dispatch={props.dispatch} photoSelection={true} handleSelection={handleSelection} />, [selectedPhotos])
  const keyExtractor = useCallback((item: IPhotoToRender) => item.hash, [])
  const getItemLayout = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

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

        <TouchableOpacity onPress={handleAlbumCreation} disabled={isCreatingAlbum}>
          <Text style={!isCreatingAlbum ? tailwind('text-blue-60 font-averta-regular text-base') : tailwind('text-blue-40 font-averta-regular text-base')}>Done</Text>
        </TouchableOpacity>
      </View>

      {
        Object.keys(props.photos).length > 0 ?
          <FlatList
            data={Object.values(props.photos)}
            numColumns={3}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
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