import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { tailwind } from '../../tailwind'
import { layoutActions, photoActions } from '../../redux/actions';
import Photo from '../../components/PhotoList/Photo';
import { uploadAlbum } from './init';
import SimpleToast from 'react-native-simple-toast';
import { normalize } from '../../helpers';
import Modal from 'react-native-modal';
import { IPhotosToRender, IPhotoToRender, ISelectedPhoto } from '../../library/interfaces/photos';
import strings from '../../../assets/lang/strings';

interface SelectPhotosModalProps {
  dispatch: any
  showSelectPhotosModal: boolean
  photos: IPhotosToRender
  albumTitle: string
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
}

const DEVICE_WIDTH = Dimensions.get('window').width

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

      uploadAlbum(albumTitle, selectedPhotos).then(() => {
        SimpleToast.show(strings.screens.photos.modals.selectable_photos.success_message)
        setAlbumTitle('')
      }).catch((err) => {
        if (err.status === 409) {
          return SimpleToast.show(strings.screens.photos.modals.selectable_photos.already_exists_error)
        }
        return SimpleToast.show(strings.screens.photos.modals.selectable_photos.other_error)
      }).finally(() => {
        dispatch(photoActions.clearSelectedPhotos())
        dispatch(layoutActions.closeSelectPhotosForAlbumModal())
        dispatch(layoutActions.openCreateAlbumModal())
        setTimeout(() => setIsCreatingAlbum(false), 1000)
      })
    } else {
      SimpleToast.show(strings.screens.photos.modals.selectable_photos.select_error)
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
        dispatch(layoutActions.closeSelectPhotosForAlbumModal())
        dispatch(photoActions.clearSelectedPhotos())
      }}
      coverScreen={false}
      swipeDirection={'down'}
      onSwipeComplete={(e) => { setIsOpen(false) }}
      swipeThreshold={150}
    >
      <View style={tailwind('h-9/10 w-full bg-white flex-col rounded-3xl items-center')}>
        <View style={tailwind('self-center bg-blue-60 rounded h-1 w-24 mt-5')} />

        <Text style={[tailwind('text-center text-sm font-averta-regular text-gray-50 mt-5'), { fontSize: normalize(14) }]}>
          {strings.screens.photos.modals.selectable_photos.title}&quot;{albumTitle}&quot;
        </Text>

        <View style={tailwind('flex-row w-full px-5 justify-between mt-5')}>
          <TouchableOpacity disabled={isCreatingAlbum} onPress={() => setIsOpen(false)}>
            <Text style={!isCreatingAlbum ? [tailwind('text-blue-60 font-averta-regular text-base'), { fontSize: normalize(14) }]
              : [tailwind('text-blue-40 font-averta-regular text-base'), { fontSize: normalize(14) }]}>
              {strings.screens.photos.modals.selectable_photos.cancel_button}
            </Text>
          </TouchableOpacity>

          <Text style={[tailwind('text-gray-70 font-averta-regular text-base'), { fontSize: normalize(14) }]}>All photos</Text>

          <TouchableOpacity onPress={handleAlbumCreation} disabled={isCreatingAlbum}>
            <Text style={!isCreatingAlbum ? [tailwind('text-blue-60 font-averta-regular text-base'), { fontSize: normalize(14) }]
              : [tailwind('text-blue-40 font-averta-regular text-base'), { fontSize: normalize(14) }]}>
              {strings.screens.photos.modals.selectable_photos.done_button}
            </Text>
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
    </Modal>
  );
}

export default React.memo(SelectPhotosModal)