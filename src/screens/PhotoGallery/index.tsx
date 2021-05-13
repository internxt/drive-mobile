import React, { useState, useEffect } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Dispatch } from 'redux';
import { WaveIndicator } from 'react-native-indicators';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import Photo from '../../components/PhotoList/Photo';
import { IPhotosToRender } from '../Photos';
import { PhotoActions } from '../../redux/actions';
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'

interface PhotoGalleryProps {
  navigation: any
  photosToRender: IPhotosToRender
  dispatch: Dispatch,
  isSyncing: boolean
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [photosToRender, setPhotosToRender] = useState<IHashedPhoto[]>(props.photosToRender.photos)
  const [downloadedPhoto, setDownloadedPhoto] = useState<any>()

  const loadUploadedPhotos = async () => {
    let finished = false
    let offset = 0
    let lastIndex = 0

    while (!finished) {
      const previews = await getPreviews(setDownloadedPhoto, lastIndex)

      lastIndex = offset + previews.length

      if (lastIndex <= offset) {
        finished = true
      } else {
        offset = lastIndex
      }
    }
  }

  const pushDownloadedPhoto = (photo: IHashedPhoto) => props.dispatch(PhotoActions.pushDownloadedPhoto(photo))

  useEffect(() => {
    const currentPhotos = photosToRender.slice()
    const newPhotos = props.photosToRender.photos

    newPhotos.forEach(newPhoto => {
      const index = currentPhotos.findIndex(currPhoto => currPhoto.hash === newPhoto.hash)

      if (index === -1) {
        currentPhotos.push(newPhoto)
      } else {
        if (currentPhotos[index].isUploaded && !currentPhotos[index].isLocal) {
          currentPhotos[index].isLocal = true
        }
      }
    })
    setPhotosToRender(currentPhotos)
  }, [props.photosToRender.photos])

  useEffect(() => {
    if (downloadedPhoto) {
      const index = photosToRender.findIndex(local => local.hash === downloadedPhoto.hash)

      if (index === -1) {
        const photo = { ...downloadedPhoto, isLocal: false }

        setPhotosToRender(currentPhotos => [...currentPhotos, photo])
      } else {
        const items = photosToRender.slice()

        items[index].isUploaded = true
        setPhotosToRender(items)
      }
    }
  }, [downloadedPhoto])

  useEffect(() => {
    loadUploadedPhotos()
  }, [])

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <AlbumDetailsModal />
        <AddItemToModal />

        <View style={tailwind('flex-col')}>
          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {strings.screens.photos.screens.photo_gallery.title}
            </Text>

            <View style={styles.headerButtonsContainer}>
              <Syncing width={20} height={20} />
              <Syncing width={20} height={20} />
              <Syncing width={20} height={20} />
            </View>
          </View>

          <View style={styles.filterContainer}>
            <View style={styles.filterButton}>
              <Syncing width={20} height={20} />
            </View>

            <View style={styles.filterButton}>
              <Syncing width={20} height={20} />
            </View>

            <View style={styles.filterButton}>
              <Syncing width={20} height={20} />
            </View>
          </View>
        </View>
        {/*
        {
          !props.isSyncing ?
            null
            :
            <View style={styles.containerSync}>
              <Text style={styles.syncText}>{strings.screens.photos.components.syncing}</Text>

              <View>
                <MaterialIndicator style={styles.spinner} color="#5291ff" size={15} />
              </View>
            </View>
        } */}
        {
          photosToRender.length ?
            <FlatList
              data={photosToRender}
              numColumns={3}
              keyExtractor={item => item.hash}
              contentContainerStyle={styles.flatList}
              renderItem={({ item }) => <Photo item={item} key={item.hash} pushDownloadedPhoto={pushDownloadedPhoto} />}
            />
            :
            <WaveIndicator color="#5291ff" size={50} />
        }
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4)
  },
  titleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'red'
  },
  title: {
    textAlign: 'center',
    color: '#5E6C84',
    fontFamily: 'Averta-Regular',
    fontSize: 18,
    borderWidth: 1
  },
  headerButtonsContainer: {
    borderWidth: 1,
    flexDirection: 'row'
  },
  filterContainer: {
    flexDirection: 'row'
  },
  filterButton: {
    flex: (1 / 3),
    height: 20,
    backgroundColor: 'white',
    borderWidth: 1
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  }
});

const mapStateToProps = (state: any) => {
  return {
    photosToRender: state.photosState.photosToRender,
    isSyncing: state.photosState.isSyncing
  };
};

export default connect(mapStateToProps)(PhotoGallery);