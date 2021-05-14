import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import { IPreview } from '../../components/PhotoList';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { getHeaders } from '../../helpers/headers';
import { IImageInfo } from 'react-native-image-zoom-viewer/built/image-viewer.type';
import Loading from '../../components/Loading';
import Modal from 'react-native-modalbox';
import { tailwind, getColor } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import CrossBlue from '../../../assets/icons/photos/cross-blue.svg'
import FolderWithCross from '../../../assets/icons/photos/folder-with-cross-blue.svg'

interface CreateAlbumProps {
  navigation: any
  photosState: PhotosState
  dispatch: any,
  layoutState: LayoutState
  authenticationState: AuthenticationState
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

function CreateAlbumModal(props: CreateAlbumProps): JSX.Element {
  const [photos, setPhotos] = useState<IPreview[]>([])
  const [albumTitle, setAlbumTitle] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<IImageInfo[]>([])
  const [isOpen, setIsOpen] = useState(props.layoutState.showAlbumModal)

  useEffect(() => {
    setIsOpen(props.layoutState.showAlbumModal)
  }, [props.layoutState.showAlbumModal])

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

  const handlePress = () => {
    // reset all selected photos
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleLongPress = (photo: IImageInfo) => {
    const selectedPhoto = [photo]

    setSelectedPhoto(selectedPhoto)
    setIsOpen(true)
  }

  return (
    <Modal
      isOpen={isOpen}
      position='bottom'
      swipeArea={40}
      style={tailwind('h-2/6 rounded-t-3xl px-10')}
      onClosed={() => {
        props.dispatch(layoutActions.closeCreateAlbumModal())
        setIsOpen(false)
      }}
    >
      <View style={tailwind('self-center bg-blue-60 rounded h-1 w-24 mt-5')} />

      <View style={tailwind('flex-row mt-6 items-center')}>
        <View style={tailwind('w-1/4 ')} />

        <Text style={tailwind('w-2/4 text-center text-base font-averta-regular text-gray-70')}>Create new album</Text>

        <View style={tailwind('w-1/4 items-end')}>
          <TouchableOpacity style={tailwind('w-14 h-8  items-end justify-center')}
            onPress={() => {
              if (albumTitle) {
                if (albumTitle.length > 30) {
                  Alert.alert('Maximum album length name is 30 characters')
                } else {
                  if (selectedPhotos.length > 0) {
                    setIsCreatingAlbum(true)
                    uploadAlbum().finally(() => setIsCreatingAlbum(false))
                    handlePress()
                  } else {
                    Alert.alert('You need to select at least one photo')
                  }
                }
              } else {
                Alert.alert('Album name is required')
              }
            }}
          >
            <CrossBlue height={13} width={13} style={tailwind('mr-2')} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={tailwind('mt-4')}>
        <View style={tailwind('absolute z-10 mt-1.5 ml-3')}>
          <FolderWithCross width={20} height={20} />
        </View>

        <TextInput
          style={tailwind('w-full h-8 bg-gray-10 text-sm font-averta-regular pl-10 pb-1 ')}
          placeholderTextColor={getColor('gray-50')}
          placeholder='Name your memories'
          onChangeText={value => setAlbumTitle(value)}
          value={albumTitle}
          autoCapitalize='none'
        />
      </View>

      <TouchableOpacity style={tailwind('self-center mt-8 bg-blue-60 px-4 py-3 rounded-full')}>
        <Text style={tailwind('text-center text-base text-white font-averta-regular')}>Add photos to album</Text>
      </TouchableOpacity>

      {
        !isLoading ?
          !isCreatingAlbum ?
            <FlatList
              data={photos}
              renderItem={({ item, index }) => <Text>A</Text>}
              numColumns={4}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.flatList}
            />
            :
            <Loading message={'Creating album...'} />
          :
          null
      }
    </Modal>
  );
}

const styles = StyleSheet.create({
  flatList: {
    paddingHorizontal: wp('1')
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbumModal);