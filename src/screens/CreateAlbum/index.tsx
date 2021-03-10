import React, { useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import SelectivePhoto from './SelectivePhoto';
import { IPreview } from '../../components/PhotoList';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { getHeaders } from '../../helpers/headers';

interface CreateAlbumProps {
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
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

function CreateAlbum(props: CreateAlbumProps): JSX.Element {
  const photos = props.photosState.localPhotos
  const previews = props.photosState.previews
  const [albumTitle, setAlbumTitle] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])

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

  const renderItem = (item: IPreview, index: number) => (<SelectivePhoto photo={item} handleSelection={handleSelection} key={index} />)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} ></BackButton>

        <TextInput
          style={styles.albumTitle}
          placeholder='Name your memories'
          onChangeText={value => setAlbumTitle(value)}
          value={albumTitle}
          autoCapitalize='none'
        />

        <TouchableOpacity style={styles.nextBtn}
          onPress={() => {
            if (albumTitle) {
              if (albumTitle.length > 30) {
                Alert.alert('Maximum album length name is 30 characters')
              } else {
                uploadAlbum()
                handlePress()
                setSelectedPhotos([])
              }
            } else {
              Alert.alert('Album name is required')
            }
          }}
        >
          <Text style={styles.nextText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        Select photos to create album
      </Text>

      {
        <FlatList
          data={previews}
          renderItem={({ item, index }) => renderItem(item, index)}
          numColumns={4}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.flatList}
        />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  albumHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15
  },
  albumTitle: {
    color: '#000000',
    fontFamily: 'Averta-Semibold',
    fontSize: 17,
    textAlign: 'center'
  },
  container: {
    alignContent: 'center',
    backgroundColor: '#fff',
    flex: 1
  },
  flatList: {
    paddingHorizontal: wp('1')
  },
  nextBtn: {
    backgroundColor: '#0084ff',
    borderRadius: 23.8,
    paddingHorizontal: 18,
    paddingVertical: 6
  },
  nextText: {
    color: 'white',
    fontFamily: 'Averta-Semibold',
    fontSize: 16
  },
  title: {
    color: 'black',
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    marginLeft: 16,
    marginVertical: 16
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbum);