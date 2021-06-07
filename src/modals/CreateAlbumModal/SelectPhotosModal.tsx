import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { tailwind } from '../../tailwind'
import { layoutActions, photoActions } from '../../redux/actions';
import Photo from '../../components/PhotoList/Photo';
import { DEVICE_WIDTH, IPhotosToRender, IPhotoToRender } from '../../screens/PhotoGallery';
import { uploadAlbum } from './init';
import SimpleToast from 'react-native-simple-toast';
import { normalize } from '../../helpers';
import Modal from 'react-native-modal';

interface SelectPhotosModalProps {
  dispatch: any
  showSelectPhotosModal: boolean
  photos: IPhotosToRender
  albumTitle: string
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
}

export interface ISelectedPhoto {
  hash: string
  photoId: number
}

function SelectPhotosModal({ dispatch, showSelectPhotosModal, photos, albumTitle, setAlbumTitle }: SelectPhotosModalProps): JSX.Element {
  const [selectedPhotos, setSelectedPhotos] = useState<ISelectedPhoto[]>([])
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false)
  const [isOpen, setIsOpen] = useState(showSelectPhotosModal)

  useEffect(() => {
    setSelectedPhotos([])
    setIsOpen(showSelectPhotosModal)
  }, [showSelectPhotosModal])

  const handleSelection = (selectedPhoto: ISelectedPhoto) => {
    const currentIds = selectedPhotos.slice()
    const exists = currentIds.find(photo => photo.hash === selectedPhoto.hash)

    if (exists) {
      setSelectedPhotos(prevPhotos => prevPhotos.filter(photo => photo.hash !== selectedPhoto.hash))
    } else {
      setSelectedPhotos(prevPhotos => [...prevPhotos, selectedPhoto])
    }
  }

  const handleAlbumCreation = () => {
    if (selectedPhotos.length > 0) {
      setIsCreatingAlbum(true)

      uploadAlbum(albumTitle, selectedPhotos, dispatch).then(() => {
        SimpleToast.show('Album saved successfully')
        setAlbumTitle('')
      }).catch((err) => {
        if (err.status === 409) {
          return SimpleToast.show('An album with the same name already exists')
        }
        return SimpleToast.show('Could not create album')
      }).finally(() => {
        dispatch(layoutActions.closeSelectPhotosForAlbumModal())
        dispatch(layoutActions.openCreateAlbumModal())
        setTimeout(() => setIsCreatingAlbum(false), 1000)
      })
    } else {
      SimpleToast.show('You need to select at least one photo')
    }
  }

  const renderItem = useCallback(({ item }) => <Photo item={item} dispatch={dispatch} photoSelection={true} handleSelection={handleSelection} />, [selectedPhotos])
  const keyExtractor = useCallback((item: IPhotoToRender) => item.hash, [])
  const getItemLayout = useCallback((data, index) => ({ length: (DEVICE_WIDTH - 80) / 3, offset: ((DEVICE_WIDTH - 80) / 3) * index, index }), [])

  return (
    <Modal
      isVisible={isOpen}
      style={tailwind('rounded-t-3xl justify-end py-0 mb-0 bg-transparent ml-0 w-full')}
      onModalHide={() => {
        dispatch(photoActions.clearSelectedPhotos())
        dispatch(layoutActions.closeSelectPhotosForAlbumModal())
      }}
      coverScreen={false}
      swipeDirection={'down'}
      onSwipeComplete={(e) => { setIsOpen(false) }}
      swipeThreshold={150}
    >
      <View style={tailwind('h-9/10 w-full bg-white flex-col rounded-3xl items-center justify-center')}>

        <View>
          <View style={tailwind('self-center bg-blue-60 rounded h-1 w-24 mt-5')} />

          <Text style={[tailwind('text-center text-sm font-averta-regular text-gray-50 mt-5'), { fontSize: normalize(14) }]}>Add photos to &quot;{albumTitle}&quot;</Text>

          <View style={tailwind('flex-row justify-between mt-5')}>
            <TouchableOpacity disabled={isCreatingAlbum} onPress={() => setIsOpen(false)}>
              <Text style={!isCreatingAlbum ? [tailwind('text-blue-60 font-averta-regular text-base'), { fontSize: normalize(14) }] : [tailwind('text-blue-40 font-averta-regular text-base'), { fontSize: normalize(14) }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[tailwind('text-gray-70 font-averta-regular text-base'), { fontSize: normalize(14) }]}>All photos</Text>

            <TouchableOpacity onPress={handleAlbumCreation} disabled={isCreatingAlbum}>
              <Text style={!isCreatingAlbum ? [tailwind('text-blue-60 font-averta-regular text-base'), { fontSize: normalize(14) }] : [tailwind('text-blue-40 font-averta-regular text-base'), { fontSize: normalize(14) }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {
            Object.keys(photos).length > 0 ?
              <FlatList
                data={Object.values(photos)}
                numColumns={3}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                style={tailwind('h-8/10 mt-2 mb-8')}
              />
              :
              null
          }
        </View>
      </View>

    </Modal>

  );
}

export default React.memo(SelectPhotosModal)