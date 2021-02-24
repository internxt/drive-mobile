import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import PhotoDetailsModal from '../../modals/PhotoDetailsModal';
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
import Photo from './Photo';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import { IHashedPhoto } from '../Home/init';
import lodash from 'lodash'
import { IPreview } from '../../components/PhotoList';

interface IPhotoGallery {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: IPhotoGallery): JSX.Element {
  const [localImages, setLocalImages] = useState<IHashedPhoto[]>([]);
  const [uploadedImages, setUploadedImages] = useState<IHashedPhoto[]>([])
  const [previews, setPreviews] = useState<IPreview[]>([])

  useEffect(() => {
    setLocalImages(props.photosState.localPhotos)
  }, [])

  useEffect(() => {
    setUploadedImages(props.photosState.uploadedPhotos)
    //console.log('uploaded photos =>', props.photosState.uploadedPhotos.length)
    //console.log('local photo =>', props.photosState.localPhotos[0])
  }, [])

  useEffect(() => {
    if (props.photosState.localPhotos && props.photosState.uploadedPhotos) {
      // Check if local and cloud
      const synced = lodash.intersectionBy(localImages, uploadedImages, 'hash')

      // Only on local or only on cloud
      const notUploaded = lodash.differenceBy(localImages, uploadedImages, 'hash')
      const notLocally = lodash.differenceBy(uploadedImages, localImages, 'hash')

      //console.log('photos synced =>', synced.length, '\nphotos uploaded but not in local =>', notLocally.length, '\nphotos on local not yet uploaded =>', notUploaded.length)

      const photos = synced.map(photo => ({ ...photo, isSynced: true, isUploaded: true }))
      const uploadedPhotos = notLocally.map(photo => ({ ...photo, isSynced: false, isUploaded: true }))
      const localPhotos = notUploaded.map(photo => ({ ...photo, isSynced: false, isUploaded: false }))
      const allPhotos = lodash.concat(photos, uploadedPhotos, localPhotos)

      //allPhotos.forEach(photo => { console.log('allPhotos =>', photo) })
      //photos.forEach(photo => console.log('synced photos =>', photo))
      //localPhotos.forEach(photo => console.log('local photos =>', photo))
      //console.log('uploaded photos =>', uploadedPhotos[0])
    }
  }, [props.photosState.uploadedPhotos, props.photosState.localPhotos])

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
            {localImages.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      <FlatList
        data={localImages}
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