import React from 'react'
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import AlbumCard from '../AlbumCard';
import EmptyAlbum from '../EmptyAlbum';
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
    photosState?: any
    authenticationState?: any
    dispatch?: any
    navigation: any
}

function AlbumList(props: AlbumListProps) {

  let albumList: IPhoto[] = props.photos || [];

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

  const keyExtractor = (item: any, index: any) => index.toString();

  const renderAlbumItem = ({ item }) => (
    <Pressable
      onPress={() => {
        props.navigation.navigate('AlbumView', { title: item.name })
      }}
      onLongPress={() => { }}
    >
      <AlbumCard withTitle={true} navigation={props.navigation} />
    </Pressable>

  );

  return (
    <View>
      <View style={styles.photoScroll}>
        <FlatList
          keyExtractor={keyExtractor}
          renderItem={renderAlbumItem}
          data={props.photosState.photos}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
        ></FlatList>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  photoScroll: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 0
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumList)