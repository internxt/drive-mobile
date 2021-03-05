import React from 'react'
import { render } from 'react-dom';
import { Text, StyleSheet, View } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import AlbumCard from '../AlbumCard';
import { IPhoto } from '../PhotoList';

export interface IAlbum {
    id: number
    albumId: number
    bucket: string
    name: string
    content: any[]
    createdAt: Date
    updatedAt: Date
}

interface AlbumListProps {
    title: string
    photos: IPhoto[]
    photosState: PhotosState
    authenticationState: AuthenticationState
    dispatch: Dispatch
    navigation: any
}

function AlbumList(props: AlbumListProps) {
  /* let albumList: IPhoto[] = props.photos || [];

  const searchString = props.photosState.searchString

  if (searchString) {
    albumList = albumList.filter((photo: IPhoto) => photo.name.toLowerCase().includes(searchString.toLowerCase()))
  }

  const sortFunction = props.photosState.sortFunction

  if (sortFunction) {
    albumList.sort(sortFunction);
  }

  const isUploading = props.photosState.isUploadingPhotoName
  const isEmptyAlbum = albumList.length === 0 && !isUploading
 */
  const keyExtractor = (item: any, index: any) => index.toString()
  const renderItem = (item) => (
    <TouchableOpacity
      onPress={() => {
        props.navigation.push('AlbumView', { title: item.name })
      }}
      onLongPress={() => { }}
    >
      <AlbumCard withTitle={true} navigation={props.navigation} />
    </TouchableOpacity>
  )

  const albums = props.photosState.albums || []

  return (
    <View style={styles.photoScroll}>
      <FlatList
        keyExtractor={keyExtractor}
        data={albums}
        renderItem={({ item }) => renderItem(item) }
        horizontal={true}
        showsHorizontalScrollIndicator={false}
      ></FlatList>
    </View>
  )
}

const styles = StyleSheet.create({
  photoScroll: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    borderWidth: 1
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumList)