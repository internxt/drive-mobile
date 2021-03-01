import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
import lodash from 'lodash'
import { IPreview } from '../../components/PhotoList';
import { WaveIndicator } from 'react-native-indicators';
import { getLocalImages } from '../Home/init';

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
    // Map the arrays to add a key to know later which icon it needs
    // Photos currently on local and cloud *THEY MUST RENDER*
    const synced = lodash.intersectionBy(localImages || [], uploadedImages || [], 'hash').map(photo => ({ ...photo, isSynced: true, isUploaded: true }))

    // The photos stored on the gallery that have not been yet uploaded *THEY MUST RENDER*
    const onlyOnLocal = lodash.differenceBy(localImages || [], uploadedImages || [], 'hash').map(photo => ({ ...photo, isSynced: false, isUploaded: false }))

    // The photos saved on the cloud that are not stored on the gallery *ONLY TO FILTER DOWNLOADED PREVIEWS*
    const onlyOnCloud = lodash.differenceBy(uploadedImages || [], localImages || [], 'hash').map(photo => ({ ...photo, isSynced: false, isUploaded: true, photoId: photo.id }))

    return { synced, onlyOnLocal, onlyOnCloud }
  }

  function photosToRenderList() {
    const res = doIntersections()

    const synced = res.synced
    const onlyLocal = res.onlyOnLocal
    const onlyCloud = res.onlyOnCloud

    const missingPhotos = lodash.intersectionBy(previewImages, onlyCloud, 'photoId').map(photo => ({ ...photo, isSynced: false, isUploaded: true }))

    return lodash.concat(onlyLocal, synced, missingPhotos)
  }

  useEffect(() => {
    const x = photosToRenderList()

    setPhotosToRender(x)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const x = photosToRenderList()

    setPhotosToRender(x)
    setIsLoading(false)
  }, [props.photosState.previews])

  return (
    <SafeAreaView style={styles.container}>

      <AlbumDetailsModal />
      <AddItemToModal />
      {/* <PhotoDetailsModal /> */}

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
            onEndReachedThreshold={0.1}
            onEndReached={() => {
              getLocalImages(props.dispatch, props.photosState.localPhotos[props.photosState.localPhotos.length - 1].id)
            }}
            renderItem={({ item }) => {
              return <Photo photo={item} id={item.id} uri={item.localUri} isSynced={item.isSynced} isUploaded={item.isUploaded} />
            }}
            numColumns={4}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.flatList}
          />
          :
          <WaveIndicator color="#5291ff" size={50} />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff',
    paddingBottom: 15
  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
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
    display: 'flex',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -2
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoGallery);