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
  const localImages = props.photosState.localPhotos
  const uploadedImages = props.photosState.uploadedPhotos
  const [allPhotos, setAllPhotos] = useState<IHashedPhoto[]>([])
  const [previews, setPreviews] = useState<IPreview[]>([])

  // everytime a preview gets fetched
  useEffect(() => {
    setPreviews(props.photosState.previews)
    //console.log('previews =>', previews)
  }, [props.photosState.previews])

  useEffect(() => {
    if (props.photosState.localPhotos && props.photosState.uploadedPhotos) {
      // Photos currently on local and cloud
      const synced = lodash.intersectionBy(localImages, uploadedImages, 'hash')

      // The photos stored on the gallery that have not been yet uploaded
      const notUploaded = lodash.differenceBy(localImages, uploadedImages, 'hash')

      // The photos saved on the cloud that are not stored on the gallery
      const notLocally = lodash.differenceBy(uploadedImages, localImages, 'hash')

      // Mapping the arrays to be able to show the different icons: Upload/Download/Synced
      const locallyAndUploaded = synced.map(photo => ({ ...photo, isSynced: true, isUploaded: true }))
      const onlyLocal = notUploaded.map(photo => ({ ...photo, isSynced: false, isUploaded: false }))
      const onlyUploaded = notLocally.map(photo => ({ ...photo, isSynced: false, isUploaded: true }))

      // Mapping of the downloaded previews that are not locally stored
      const onlyUploadedParsed = onlyUploaded.map(photo => ({ ...photo, photoId: photo.id }))
      // The downloaded previews that are not locally saved
      const missingPhotos = lodash.intersectionBy(previews, onlyUploadedParsed, 'photoId')

      const photosToRender = lodash.concat(missingPhotos, onlyLocal, locallyAndUploaded)

      setAllPhotos(photosToRender)

      //console.log('\n')
      //console.log('photosToRender =>', photosToRender.length)
      //console.log('locallyAndUploaded =>', locallyAndUploaded.length)
      //console.log('onlyLocal =>', onlyLocal[0])
      //console.log('onlyUploaded =>', onlyUploadedParsed[0])
      //console.log('previews =>', previews.length)
      //console.log('missingPhotos =>', missingPhotos[0])
    }
  }, [])

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
        data={allPhotos}
        renderItem={({ item }) => {
          //console.log('item =>', item)
          return <Photo id={item.id} uri={item.localUri} isSynced={item.isSynced} isUploaded={item.isUploaded} />
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