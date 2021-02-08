import React, { useEffect, useState } from 'react'
import { ScrollView, Text, RefreshControl, StyleSheet, Pressable, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { PhotoActions } from '../../redux/actions';
import EmptyAlbum from '../EmptyAlbum';
import PhotoItem from '../PhotoItem';

export interface IPhoto {
  id?: number
  photoId?: number
  albumId?: number
  bucket?: string
  uri: any
  name: string
  type: string
  size?: number
  createdAt?: Date
  updatedAt?: Date
}

interface DeletedPhotoListProps {
  title: string
  deleted: IPhoto[]
  photosState?: any
  authenticationState?: any
  dispatch?: any
  navigation: any
}

function DeletedPhotoList(props: DeletedPhotoListProps) {
  const [refreshing, setRefreshing] = useState(false)

  const photoList: IPhoto[] = props.deleted || [];

  useEffect(() => {
    setRefreshing(false)
  }, [props.photosState.deleted])

  const searchString = props.photosState.searchString

  // TODO: Update flatlist with filtered items.
  /* if (searchString) {
    deleted = deleted.filter((photo: IPhoto) => photo.name.toLowerCase().includes(searchString.toLowerCase()))
  } */

  const sortFunction = props.photosState.sortFunction

  if (sortFunction) {
    photoList.sort(sortFunction);
  }

  useEffect(() => {
    if (!props.photosState.deleted) {
      props.dispatch(PhotoActions.getDeletedPhotos(props.authenticationState.user));
    }
  }, [])

  const isUploading = props.photosState.isUploadingPhotoName
  const isEmptyAlbum = photoList.length === 0 && !isUploading

  useEffect(() => {
    //console.log('--- UPLOADING PROGRESS ON photoList ---', photosState.progress)

  }, [props.photosState.progress])

  const keyExtractor = (item: any, index: any) => index.toString();

  const renderDeletePhotoItem = ({ item }: { item: IPhoto }) => (
    <Pressable
      onPress={() => {
        props.navigation.navigate(props.title);
      }}
      onLongPress={() => {
        //props.dispatch(fileActions.selectPhoto(item))
      }}
      style={{
        display: 'flex',
        flex: 1,
        backgroundColor: '#fff'
      }}
    >
      <PhotoItem isLoading={props.photosState.loading} item={item} />
    </Pressable>
  );

  return (
    <View>
      {
        isEmptyAlbum ?
          <EmptyAlbum />
          :
          <Text style={styles.dNone}></Text>
      }

      <View style={styles.photoScroll}>
        <FlatList
          keyExtractor={keyExtractor}
          renderItem={renderDeletePhotoItem}
          refreshing={props.photosState.loadingPhotos}
          data={photoList}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
        ></FlatList>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  dNone: {
    display: 'none'
  },
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

export default connect(mapStateToProps)(DeletedPhotoList)