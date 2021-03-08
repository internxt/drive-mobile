import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Dispatch } from 'redux';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { IAlbum } from '../../screens/CreateAlbum';
import { IHashedPhoto } from '../../screens/Home/init';

export interface AlbumProps {
  navigation: any
  photosState?: PhotosState
  dispatch?: Dispatch
  authenticationState?: AuthenticationState
  album: IAlbum
}

// TODO: Add album param
export function AlbumCard(props: AlbumProps): JSX.Element {
  const photos = props.album.photos
  const bigImg = photos[0].localUri
  const [albumCoverPhotos, setAlbumCoverPhotos] = useState<Array<string | undefined>>([])
  const [secondaryPhotos, setSecondaryPhotos] = useState<IHashedPhoto[]>()

  const keyExtractor = (item: IHashedPhoto, index: number) => index.toString()
  const renderItem = (item: IHashedPhoto) => (<Image style={styles.image} source={{ uri: item.uri }} />)

  useEffect(() => {
    let mainPhotos = []
    let otherPhotos: IHashedPhoto[]

    if (photos.length >= 2) {
      if (photos.length >= 3) {
        mainPhotos = [photos[1].localUri, photos[2].localUri]
        otherPhotos = photos.slice(3)

      } else {
        mainPhotos = [photos[1].localUri]
        otherPhotos = photos.slice(3)
      }

      setAlbumCoverPhotos(mainPhotos)
      setSecondaryPhotos(otherPhotos)
    }
  }, [])

  return (
    <View style={styles.mainContainer}>
      <View style={[styles.card, styles.boxShadow]}>
        <View style={styles.albumCover}>
          <Image style={styles.bigimage} source={{ uri: bigImg }} />

          {
            albumCoverPhotos ?
              <View style={styles.downimg}>
                {
                  albumCoverPhotos.map(photo => (<Image style={styles.image} source={{ uri: photo }} key={photo} />))
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
                renderItem={({ item }) => renderItem(item)}
                style={styles.photoGrid}
                horizontal={false}
                numColumns={3}
                keyExtractor={keyExtractor}
                getItemLayout={(data, index) => (
                  { length: 58, offset: 58 * index, index }
                )}
              />
            </View>
            :
            null
        }
      </View>

      <Text style={styles.albumTitle}>{props.album.title}</Text>
      <Text style={styles.albumSubtitle}>{props.album.photos.length} photos</Text>
    </View>
  )

}

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 12,
    marginTop: 12
  },
  boxShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.27,
    shadowRadius: 7.49,
    elevation: 12
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 1,
    paddingLeft: 6,
    paddingRight: 1
  },
  albumCover: {
  },
  image: {
    width: 58,
    height: 58,
    resizeMode: 'cover',
    marginRight: 5,
    marginBottom: 5
  },
  bigimage: {
    width: 121,
    height: 121,
    resizeMode: 'cover'
  },
  downimg: {
    display: 'flex',
    flexDirection: 'row',
    marginRight: 1,
    marginTop: 5
  },
  albumTitle: {
    maxWidth: 300,
    fontFamily: 'Averta-Regular',
    fontSize: 22,
    letterSpacing: -0.14,
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 8,
    color: '#2a2c35'
  },
  albumSubtitle: {
    fontFamily: 'Averta-Regular',
    letterSpacing: -0.14,
    marginLeft: 16,
    fontSize: 16,
    color: '#b5b5b5'
  },
  photoGrid: {
    flex: 1
  }
});

export default AlbumCard;