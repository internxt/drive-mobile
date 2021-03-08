import React from 'react'
import { StyleSheet, View } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
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
  const keyExtractor = (item: IAlbum, index: number) => index.toString()
  const renderItem = (item: IAlbum) => (
    <TouchableOpacity
      onPress={() => {
        props.navigation.push('AlbumView', { album: item })
      }}
    >
      <AlbumCard navigation={props.navigation} album={item} />
    </TouchableOpacity>
  )

  const albums = props.photosState && props.photosState.albums || []

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
    flexDirection: 'row',
    padding: 16
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumList)