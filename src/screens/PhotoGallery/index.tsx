import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import PhotoList from '../../components/PhotoList';
import { MaterialIndicator, WaveIndicator } from 'react-native-indicators';
import { cachePicture, downloadPhoto, getLocalImages, getPreviews, IHashedPhoto } from '../Photos/init';
import _ from 'lodash'
import FileViewer from 'react-native-file-viewer'
import RNFS from 'react-native-fs'
import strings from '../../../assets/lang/strings';

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function setStatus(localPhotos: IHashedPhoto[], remotePhotos: IHashedPhoto[]) {
  const localPhotosLabel = _.map(localPhotos, o => _.extend({ isLocal: true, galleryUri: o.localUri }, o))
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))

  const union = _.unionBy([...localPhotosLabel, ...remotePhotosLabel], (o) => {
    const a = localPhotosLabel.find(id => id.hash === o.hash)
    const b = remotePhotosLabel.find(id => id.hash === o.hash)

    return _.merge(a, b);
  })

  return union;
}

function setRemotePhotos(localPhotos: IHashedPhoto[], remotePhotos: IHashedPhoto[], loadStartLocalPhotos?: any) {
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))
  const localPhotosLabel = _.map(localPhotos, o => _.extend({ isLocal: true, isUploaded: false, galleryUri: o.localUri }, o))

  const remotes = _.differenceBy([...remotePhotosLabel], [...localPhotosLabel], 'hash')
  const locals = _.differenceBy([...localPhotosLabel], [...remotePhotosLabel], 'hash')
  const synced = _.intersectionBy([...localPhotosLabel], [...remotePhotosLabel], 'hash')

  const syncedUpdated = synced.map(photo => ({ ...photo, isUploaded: true }))

  const union = _.union(locals, syncedUpdated, remotes)

  return union;

}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [localPhotos, setLocalPhotos] = useState<IHashedPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<IHashedPhoto[]>([]);
  const remotePhotos = setRemotePhotos(localPhotos, uploadedPhotos);
  const [hasFinished, setHasFinished] = useState(false)
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [offsetCursor, setOffsetCursor] = useState(0)
  const [prevOffset, setPrevOffset] = useState(0)

  const start = (offset = 0, endCursor?: string) => {
    setHasFinished(false)

    return loadLocalPhotos(endCursor).then(() => {
      return loadUploadedPhotos(offset)
    }).finally(() => setHasFinished(true))
  }

  const loadLocalPhotos = (endCursor?: string) => {
    return getLocalImages(endCursor).then(res => {
      setEndCursor(res.endCursor)
      setLocalPhotos(endCursor ? localPhotos.concat(res.assets) : res.assets)
    })
  }

  const loadUploadedPhotos = (offset: number) => {
    setPrevOffset(offset)
    getPreviews(push, offset).then((res) => {
      const lastIndex = offsetCursor + res.length

      setOffsetCursor(lastIndex)
      setPrevOffset(offset)
    }).then(() => {
      setRemotePhotos(localPhotos, uploadedPhotos)
    })
  }

  const loadMoreData = (offsetCursor: number, endCursor: string | undefined) => {
    setHasFinished(false)
    if (offsetCursor > prevOffset) {
      start(offsetCursor, endCursor).then(() => { setHasFinished(true) })
    }
  }

  const push = (preview: any) => {
    if (preview) {
      const exists = uploadedPhotos.find(photo => photo.localUri === preview.localUri)

      if (!exists) {
        setUploadedPhotos(currentPhotos => [...currentPhotos, preview])
      }
    }
  }

  useEffect(() => {
    start().finally(() => {
      setIsLoading(false)
    })
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <AlbumDetailsModal />
      <AddItemToModal />

      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {strings.screens.photos.screens.photo_gallery.title}
          </Text>

          <Text style={styles.photosCount}>
            {remotePhotos.length} {strings.screens.photos.screens.photo_gallery.subtitle}
          </Text>
        </View>

        {
          !props.photosState.isSync ?
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
          !isLoading ?
            <PhotoList
              data={remotePhotos}
              numColumns={3}
              onRefresh={() => {
                setIsLoading(true)
                setOffsetCursor(0)
                start(offsetCursor).then(() => { setHasFinished(false) }).catch(() => { })
              }}
              onItemPress={(event, item) => {

                if (item.isUploaded && !item.isLocal) {
                  downloadPhoto(item).then(x => {

                  }).catch((err) => {
                  })
                } else {
                  cachePicture(item).then(tempFile => {
                    FileViewer.open(tempFile, {
                      onDismiss: () => RNFS.unlink(tempFile)
                    });
                  })
                }
              }}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatList}
              onEndReached={() => {
                // change isLoading for another state, small indicator right on the bottom
                //setIsLoading(true)
                //loadLocalPhotos(endCursor)
                if (hasFinished) {
                  loadMoreData(offsetCursor, endCursor)
                }
              }}
              onEndReachedThreshold={0.2}
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
  return { ...state };
};

export default connect(mapStateToProps)(PhotoGallery);