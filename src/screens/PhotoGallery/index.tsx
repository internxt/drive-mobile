import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal';
import Photo from './Photo';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import lodash from 'lodash'
import { WaveIndicator } from 'react-native-indicators';
import { getLocalImages, IHashedPhoto } from '../Home/init';
import SortModalPhotos from '../../modals/SortModal/SortModalPhotos';

interface IPhotoGallery {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: any,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: IPhotoGallery): JSX.Element {
  const [localImages, setLocalImages] = useState<IHashedPhoto[]>([])
  const uploadedImages = props.photosState.uploadedPhotos
  const previewImages = props.photosState.previews
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>([])

  const [endCursor, setEndCursor] = useState('')
  const [hasNextPage, setHasNextPage] = useState(true)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Map the arrays to add a key to know later which icon it needs
  const doIntersections = (photos: IHashedPhoto[]) => {
    // Photos currently on local and cloud *THEY MUST RENDER*
    const synced = lodash.intersectionBy(photos || [], uploadedImages || [], 'hash').map(photo => ({ ...photo, isSynced: true, isUploaded: true }))

    // The photos stored on the gallery that have not been yet uploaded *THEY MUST RENDER*
    const onlyOnLocal = lodash.differenceBy(photos || [], uploadedImages || [], 'hash').map(photo => ({ ...photo, isSynced: false, isUploaded: false }))

    // The photos saved on the cloud that are not stored on the gallery *ONLY TO FILTER DOWNLOADED PREVIEWS*
    const onlyOnCloud = lodash.differenceBy(uploadedImages || [], photos || [], 'hash').map(photo => ({ ...photo, isSynced: false, isUploaded: true, photoId: photo.id }))

    return { synced, onlyOnLocal, onlyOnCloud }
  }

  function photosToRenderList(photos: IHashedPhoto[] = []) {
    const categorizedImages = doIntersections(photos)

    const synced = categorizedImages.synced
    const onlyLocal = categorizedImages.onlyOnLocal
    const onlyCloud = categorizedImages.onlyOnCloud
    const photosToRender = synced.concat(onlyLocal)
    //const photosToRender = onlyLocal.concat(synced) // SI SE PONEN AL REVES SE DUPLICAN
    //const missingPhotos = lodash.intersectionBy(previewImages, onlyCloud, 'photoId').map(photo => ({ ...photo, isSynced: false, isUploaded: true }))

    return photosToRender
  }

  useEffect(() => {
    getLocalImages(props.dispatch).then(res => {
      const photosToRender = photosToRenderList(res.images)

      setLocalImages(res.images)
      setEndCursor(res.assets.endCursor)
      setHasNextPage(res.assets.hasNextPage)
      setPhotosToRender(photosToRender)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const newPhotosToRender = photosToRenderList(localImages)

    setPhotosToRender(newPhotosToRender)
  }, [props.photosState.previews])

  return (
    <SafeAreaView style={styles.container}>

      <AlbumDetailsModal />
      <AddItemToModal />
      <SortModalPhotos />
      {/* <PhotoDetailsModal /> */}

      <View style={styles.header}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {props.navigation.state.params.title}
          </Text>

          <Text style={styles.photosCount}>
            {photosToRender.length} Photos
          </Text>
        </View>

        {/* <MenuItem
          style={styles.mr10}
          name="list"
          onClickHandler={() => {
            props.dispatch(layoutActions.openSortModal())
          }} /> */}
      </View>

      {
        !isLoading ?
          <FlatList
            data={photosToRender}
            onEndReachedThreshold={0.1}
            onEndReached={() => {
              if (hasNextPage) {
                setIsLoadingMore(true)

                // Gets next 39 local images of the phone
                getLocalImages(props.dispatch, endCursor).then(res => {
                  // Concat the new array of photos that you got to the end of the photos array you already have
                  const newLocalPhotos = localImages.concat(res.images)
                  const newPhotosToRender = photosToRenderList(newLocalPhotos)

                  setPhotosToRender(newPhotosToRender)

                  setLocalImages(newLocalPhotos)
                  setHasNextPage(res.assets.hasNextPage)
                  setEndCursor(res.assets.endCursor)
                  setIsLoadingMore(false)
                })
              }
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
      {
        isLoadingMore ?
          <View style={{ marginTop: 30 }}>
            <WaveIndicator color="#5291ff" size={50} />
          </View>
          :
          null
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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