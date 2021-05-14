import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Dispatch } from 'redux';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { IAlbum, IAlbumPhoto } from '../../screens/CreateAlbum';

export interface AlbumProps {
  navigation: any
  photosState?: PhotosState
  dispatch?: Dispatch
  authenticationState?: AuthenticationState
  album: IAlbum
}

export function AlbumCard(props: AlbumProps): JSX.Element {
  const photos = props.album.photos
  const bigImg = photos[0]
  const [albumCoverPhotos, setAlbumCoverPhotos] = useState<IAlbumPhoto[]>([])
  const [secondaryPhotos, setSecondaryPhotos] = useState<IAlbumPhoto[]>()

  const renderItem = (item: IAlbumPhoto, index: number) => (<Image style={styles.image} source={{ uri: item.localUri }} key={index} />)

  // set the three main photos of the album and remove them from the rest of the array
  useEffect(() => {
    let mainPhotos = []
    let otherPhotos = []

    if (photos.length >= 2) {
      if (photos.length >= 3) {
        mainPhotos = [photos[1], photos[2]]
        otherPhotos = photos.slice(3)

      } else {
        mainPhotos = [photos[1]]
        otherPhotos = photos.slice(2)
      }

      setAlbumCoverPhotos(mainPhotos)
      setSecondaryPhotos(otherPhotos)
    }
  }, [])

  return (
    <TouchableOpacity
      onPress={() => {
        //props.navigation.push('AlbumView')
      }}
    >
      <View style={styles.mainContainer}>
        <View style={[styles.card, styles.boxShadow]}>
          <View style={styles.albumCover}>
            <Image style={styles.bigimage} source={{ uri: bigImg.localUri }} />

            {
              albumCoverPhotos ?
                <View style={styles.downimg}>
                  {
                    albumCoverPhotos.map((photo, index) => (<Image style={styles.image} source={{ uri: photo.localUri }} key={index} />))
                  }
                </View>
                :
                null
            }
          </View>

          {
            photos.length >= 3 ?
              <View>
                <FlatList
                  data={secondaryPhotos}
                  renderItem={({ item, index }) => renderItem(item, index)}
                  style={styles.photoGrid}
                  horizontal={false}
                  numColumns={3}
                  getItemLayout={(data, index) => (
                    { length: 58, offset: 58 * index, index }
                  )}
                />
              </View>
              :
              null
          }
        </View>

        <Text style={styles.albumTitle}>{props.album.name}</Text>
        <Text style={styles.albumSubtitle}>{props.album.photos.length} photos</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  albumCover: {
  },
  albumSubtitle: {
    color: '#b5b5b5',
    fontFamily: 'Averta-Regular',
    fontSize: 16,
    letterSpacing: -0.14,
    marginLeft: 16
  },
  albumTitle: {
    color: '#2a2c35',
    fontFamily: 'Averta-Regular',
    fontSize: 22,
    letterSpacing: -0.14,
    marginBottom: 8,
    marginLeft: 16,
    marginTop: 20,
    maxWidth: 300
  },
  bigimage: {
    height: 121,
    resizeMode: 'cover',
    width: 121
  },
  boxShadow: {
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.27,
    shadowRadius: 7.49
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingBottom: 1,
    paddingLeft: 6,
    paddingRight: 1,
    paddingTop: 6
  },
  downimg: {
    display: 'flex',
    flexDirection: 'row',
    marginRight: 1,
    marginTop: 5
  },
  image: {
    height: 58,
    marginBottom: 5,
    marginRight: 5,
    resizeMode: 'cover',
    width: 58
  },
  mainContainer: {
    marginHorizontal: 12,
    marginTop: 12
  },
  photoGrid: {
    flex: 1
  }
});

export default AlbumCard;