import { indexOf } from 'lodash';
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { IAlbum } from '../../screens/CreateAlbum';
import AlbumCard from '../AlbumCard';

interface AlbumListProps {
  photosState?: PhotosState
  authenticationState?: AuthenticationState
  dispatch?: Dispatch
  navigation: any
}

function AlbumList(props: AlbumListProps) {
  const albums = props.photosState && props.photosState.albums
  const previews = props.photosState && props.photosState.previews

  const renderItem = (item: IAlbum, index: number) => (<AlbumCard navigation={props.navigation} album={item} key={index} />)

  const filterPhotos = () => {
    if (albums && previews) {
      albums.forEach(album => {
        album.photos.forEach(photo => {
          previews.forEach(preview => {
            if (preview.photoId === photo.id) {
              photo.localUri = preview.localUri
            }
          })
        })
      })
    }
  }

  useEffect(() => {
    filterPhotos()
  }, [])

  useEffect(() => {
    filterPhotos()
  }, [props.photosState?.previews])

  return (
    <View style={styles.photoScroll}>
      <FlatList
        data={albums}
        extraData={previews}
        renderItem={({ item, index }) => renderItem(item, index) }
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      ></FlatList>
    </View>
  )
}

const styles = StyleSheet.create({
  photoScroll: {
    flexDirection: 'row',
    padding: 16
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumList)