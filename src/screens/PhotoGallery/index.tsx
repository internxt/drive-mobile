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
import { WaveIndicator } from 'react-native-indicators';

interface IPhotoGallery {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: IPhotoGallery): JSX.Element {
  const previewImages = props.photosState.previews
  const localImages = props.photosState.localPhotos
  const uploadedImages = props.photosState.uploadedPhotos
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [photosToRender, setPhotosToRender] = useState<IPreview[]>([])

  const doIntersections = () => {
    // Photos currently on local and cloud *THEY MUST RENDER*
    const synced = lodash.intersectionBy(localImages || [], uploadedImages || [], 'hash')

    // The photos stored on the gallery that have not been yet uploaded *THEY MUST RENDER*
    const onlyOnLocal = lodash.differenceBy(localImages || [], uploadedImages || [], 'hash')

    // The photos saved on the cloud that are not stored on the gallery *ONLY TO FILTER DOWNLOADED PREVIEWS*
    const onlyOnCloud = lodash.differenceBy(uploadedImages || [], localImages || [], 'hash')

    return { synced, onlyOnLocal, onlyOnCloud }
  }

  function photosToRenderList() {
    const res = doIntersections()

    // Map the arrays to add a key to know later which icon it needs
    const synced = res.synced.map(photo => ({ ...photo, isSynced: true, isUploaded: true }))
    const onlyLocal = res.onlyOnLocal.map(photo => ({ ...photo, isSynced: false, isUploaded: false }))
    // OnlyUploaded needs an extra prop to match the other objects
    const onlyCloud = res.onlyOnCloud.map(photo => ({ ...photo, photoId: photo.id }))

    //console.log('onlyCloud =>', onlyCloud.length)
    //console.log('previews =>', previewImages.length)
    const missingPhotos = lodash.intersectionBy(previewImages, onlyCloud, 'photoId').map(photo => ({ ...photo, isSynced: false, isUploaded: true }))
    //console.log('missing =>', missingPhotos.length)

    //console.log(uniqueMissingPhotos)

    return lodash.concat(onlyLocal, synced, missingPhotos)
  }

  useEffect(() => {
    const x = photosToRenderList()

    setPhotosToRender(x)
    setIsLoading(false)
  }, [props.photosState.previews])

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
            {photosToRender.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      {
        !isLoading ?
          <FlatList
            data={photosToRender}
            renderItem={({ item }) => {
              return <Photo id={item.photoId} uri={item.localUri} isSynced={item.isSynced} isUploaded={item.isUploaded} />
            }}
            numColumns={5}
            //Setting the number of column
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.flatList}
          />
          :
          <WaveIndicator color="#5291ff" size={50} />
      }
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