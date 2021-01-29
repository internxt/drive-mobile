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
  uri: any
  name: string
  type: string
  size?: number
  preview?: any
  albumId?: number
  bucket?: string
  createdAt?: Date
  updatedAt?: Date
}

interface PhotoListProps {
  title: string
  photos: IPhoto[]
  photosState?: any
  authenticationState?: any
  dispatch?: any
  navigation: any
}

function PhotoList(props: PhotoListProps) {
  const [refreshing, setRefreshing] = useState(false)

  const { photosState } = props;
  const { folderContent } = photosState;

  let photoList: IPhoto[] = props.photos || [];

  useEffect(() => {
    setRefreshing(false)
    photoList = props.photosState.photos;
    console.log("PHOTOLIST", props.photosState.photos)
  }, [props.photosState.photos])

  const searchString = props.photosState.searchString

  if (searchString) {
    photoList = photoList.filter((photo: IPhoto) => photo.name.toLowerCase().includes(searchString.toLowerCase()))
  }

  const sortFunction = props.photosState.sortFunction

  if (sortFunction) {
    photoList.sort(sortFunction);
  }

  useEffect(() => {
    if (!props.photosState.photos) {
      const rootPreviewId = props.authenticationState.user.rootPreviewId

      props.dispatch(PhotoActions.getFolderContent(rootPreviewId))
    }
  }, [])

  const isUploading = props.photosState.isUploadingPhotoName
  const isEmptyAlbum = photoList.length === 0 && !isUploading

  useEffect(() => {
    //console.log('--- UPLOADING PROGRESS ON photoList ---', photosState.progress)

  }, [photosState.progress])

  const keyExtractor = (item: any, index: any) => index.toString();

  const renderAllPhotoItem = ({ item }: { item: IPhoto }) => (
    <Pressable
      onPress={() => {
        props.navigation.navigate(props.title);
      }}
      onLongPress={() => {
        //props.dispatch(fileActions.selectPhoto(item))
      }}
      style={{
        display: "flex",
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

      {
        isUploading ?
          <PhotoItem
            item={{ uri: '', name: '', type: '' }}
            isLoading={props.photosState.loading}
          />
          :
          null
      }

      <View style={styles.photoScroll}>
        <FlatList
          keyExtractor={keyExtractor}
          renderItem={renderAllPhotoItem}
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
  photoListContentsScrollView: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  dNone: {
    display: 'none'
  },
  photoScroll: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    marginTop: 0,
  },
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)