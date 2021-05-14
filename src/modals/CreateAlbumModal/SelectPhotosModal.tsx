import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { IPreview } from '../../components/PhotoList';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { getHeaders } from '../../helpers/headers';
import { IImageInfo } from 'react-native-image-zoom-viewer/built/image-viewer.type';
import Modal from 'react-native-modalbox';
import { tailwind } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import { IHashedPhoto } from '../../screens/Photos/init';
import Photo from '../../components/PhotoList/Photo';

interface SelectPhotosModalProps {
  dispatch: any
  showSelectPhotosModal: boolean
  authenticationState: AuthenticationState
  photos: IHashedPhoto[]
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
  const [photos, setPhotos] = useState<IPreview[]>([])
  const [albumTitle, setAlbumTitle] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<IImageInfo[]>([])
  const [isOpen, setIsOpen] = useState(props.showSelectPhotosModal)
  const [step, setStep] = useState(1)

  useEffect(() => {
    setIsOpen(props.showSelectPhotosModal)
  }, [props.showSelectPhotosModal])

  const uploadAlbum = async (): Promise<void> => {
    const xToken = props.authenticationState.token
    const mnemonic = props.authenticationState.user.mnemonic
    const headers = await getHeaders(xToken, mnemonic)
    const body = { name: albumTitle, photos: selectedPhotos }

    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/album`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(res => {
      return res.json()
    })
  }

  const handleSelection = (selectedPhotoId: number) => {
    const currentSelectedPhotos = selectedPhotos
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
    if (albumTitle) {
      if (albumTitle.length > 30) {
        Alert.alert('Maximum album length name is 30 characters')
      } else {
        if (selectedPhotos.length > 0) {
          setIsCreatingAlbum(true)
          uploadAlbum().finally(() => setIsCreatingAlbum(false))
        } else {
          Alert.alert('You need to select at least one photo')
        }
      }
    } else {
      Alert.alert('Album name is required')
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

      <Text style={tailwind('text-center text-sm font-averta-regular text-gray-50 mt-5')}>Add photos to ALBUM_NAME</Text>

      <View style={tailwind('flex-row justify-between mt-5')}>
        <TouchableOpacity>
          <Text style={tailwind('text-blue-60 font-averta-regular text-base')}>Cancel</Text>
        </TouchableOpacity>

        <Text style={tailwind('text-gray-70 font-averta-regular text-base')}>All photos</Text>

        <TouchableOpacity>
          <Text style={tailwind('text-blue-60 font-averta-regular text-base')}>Done</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={props.photos}
        numColumns={3}
        keyExtractor={item => item.hash}
        renderItem={({ item }) => <Photo item={item} key={item.hash} photoSelection={true} />}
        style={tailwind('h-8/10 mt-2 mb-8')}
      />
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { showSelectPhotosModal: state.layoutState.showSelectPhotosModal, photos: state.photosState.photosToRender.photos };
};

export default connect(mapStateToProps)(SelectPhotosModal);