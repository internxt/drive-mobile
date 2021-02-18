import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import PhotoDetailsModal from '../../modals/PhotoDetailsModal';
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
import * as MediaLibrary from 'expo-media-library';
import Photo from './Photo';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { IPhoto } from '../../components/PhotoList';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';

interface IPhotoGallery {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: IPhotoGallery): JSX.Element {
  const [images, setImages] = useState<IPhoto[]>([]);
  const [uploadedImages, setUploadedImages] = useState<IPhoto[]>([])

  useEffect(() => {
    setImages(props.photosState.localPhotos)
    //console.log('images =>', images)

  }, [props.photosState.localPhotos])

  useEffect(() => {
    setUploadedImages(props.photosState.uploadedPhotos)
    //console.log('uploaded photo =>', props.photosState.uploadedPhotos[0])
    //console.log('local photo =>', props.photosState.localPhotos[0])

  }, [props.photosState.uploadedPhotos])

  useEffect(() => {
    if (images && uploadedImages) {

    }
  }, [images, uploadedImages])

  return (
    <View style={styles.container}>

      <AlbumDetailsModal />
      <AddItemToModal />
      <PhotoDetailsModal />

      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {props.navigation.state.params.title}
          </Text>

          <Text style={styles.photosCount}>
            {images.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      <FlatList
        data={images}
        renderItem={({ item }) => {

          return <Photo id={item.id} uri={item.uri} />
        } }
        numColumns={3}
        //Setting the number of column
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.flatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingBottom: 15,
    marginBottom: 0
  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 45,
    paddingVertical: 7,
    paddingHorizontal: 20,
    height: '8%'
  },
  albumTitle: {
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center'

  },
  photosCount: {
    fontFamily: 'Averta-Regular',
    fontSize: 13,
    letterSpacing: 0,
    paddingTop: 5,
    color: '#bfbfbf',
    textAlign: 'center'
  },
  titleWrapper: {
    display: 'flex'
  },
  flatList: {
    paddingHorizontal: wp('1')
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoGallery);