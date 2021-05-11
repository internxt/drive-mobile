import React, { useState, useEffect } from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import '../../../assets/icons/icon-back.png';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Dispatch } from 'redux';
import { MaterialIndicator, WaveIndicator } from 'react-native-indicators';
import { getPreviews, IHashedPhoto } from '../Photos/init';
import strings from '../../../assets/lang/strings';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Photo from '../../components/PhotoList/Photo';
import { IPhotosToRender } from '../Photos';
import { PhotoActions } from '../../redux/actions';

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
    <SafeAreaView style={styles.container}>
      <AlbumDetailsModal />
      <AddItemToModal />

      <View style={styles.albumHeader}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => props.navigation.navigate('Photos')}
        >
          <Image style={styles.icon} source={require('../../../assets/icons/icon-back.png')} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {strings.screens.photos.screens.photo_gallery.title}
          </Text>

          <Text style={styles.photosCount}>
            {photosToRender.length} {strings.screens.photos.screens.photo_gallery.subtitle}
          </Text>
        </View>

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
        }
      </View>

      <View style={{ flex: 1 }}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  albumHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '8%',
    justifyContent: 'space-between'
  },
  buttonWrapper: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
    width: 45
  },
  icon: {
    height: 18,
    tintColor: '#0084ff',
    width: 11
  },
  albumTitle: {
    color: '#000000',
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    textAlign: 'center'
  },
  container: {
    alignContent: 'center',
    backgroundColor: '#fff',
    flex: 1,
    paddingBottom: 15
  },
  containerSync: {
    flexDirection: 'row',
    marginRight: 8
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  },
  photosCount: {
    color: '#bfbfbf',
    fontFamily: 'Averta-Regular',
    fontSize: 13,
    letterSpacing: 0,
    paddingTop: 5,
    textAlign: 'center'
  },
  spinner: {
  },
  syncText: {
    color: 'grey',
    fontFamily: 'Averta-Bold',
    marginRight: 8
  },
  titleWrapper: {
    display: 'flex',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: -2
  }
});

const mapStateToProps = (state: any) => {
  return {
    photosToRender: state.photosState.photosToRender,
    isSyncing: state.photosState.isSyncing
  };
};

export default connect(mapStateToProps)(PhotoGallery);