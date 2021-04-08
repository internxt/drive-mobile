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
import { MaterialIndicator } from 'react-native-indicators';
import { cachePicture, downloadPhoto, getLocalImages, getPreviews, getSyncingDownloadPreviews, IHashedPhoto, setSyncingDownloadPreviews } from '../Photos/init';
import _ from 'lodash'
import FileViewer from 'react-native-file-viewer'
import RNFS from 'react-native-fs'

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function setStatus(localPhotos: IHashedPhoto[], remotePhotos: IHashedPhoto[]) {
  const localPhotodLabel = _.map(localPhotos, o => _.extend({ isLocal: true, galleryUri: o.localUri }, o))
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))

  const union = _.unionBy([...localPhotodLabel, ...remotePhotosLabel], (o) => {
    const a = localPhotodLabel.find(id => id.hash === o.hash)
    const b = remotePhotosLabel.find(id => id.hash === o.hash)

    return b;
  })

  return union;
}

function setRemotePhotos(localPhotos: IHashedPhoto[], remotePhotos: IHashedPhoto[]) {
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))
  const localPhotosLabel = _.map(localPhotos, o => _.extend({ isLocal: true, galleryUri: o.localUri }, o))

  const difference = _.differenceBy([...remotePhotosLabel], [...localPhotosLabel], 'hash')

  return difference;

}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [localPhotos, setLocalPhotos] = useState<IHashedPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<IHashedPhoto[]>([]);
  const [isDownloading, setIsDownloading] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [offsetCursor, setOffsetCursor] = useState<number | undefined>(undefined);
  const remotePhotos = setRemotePhotos(localPhotos, uploadedPhotos);
  const [isStart, setIsStart] = useState(false)
  let isDownloadingRemote = false;

  const loadLocalPhotos = (after?: string) => {
    return getLocalImages(after).then(res => {
      setLocalPhotos(after ? localPhotos.concat(res.assets) : res.assets)
      setEndCursor(res.endCursor)
      return res;
    }).then(res => {
      setIsLoading(false);
      return res;
    })
  }

  const loadUploadedPhotos = async (offset?: any) => {
    setIsDownloading(true);
    getPreviews(push, setOffset, offset, isDownloadingRemote).then((res) => {
      isDownloadingRemote = false;
    }).catch(() => {
    }).finally(() => {
      setIsDownloading(false);
    })
  }

  const push = (preview: any) => {
    if (preview) {
      const exists = uploadedPhotos.find(photo => photo.localUri === preview.localUri)

      if (!exists) {
        setUploadedPhotos(currentPhotos => [...currentPhotos, preview])
      }
    }
  }

  const setOffset = (offset: number) => {
    if (offset) {
      setOffsetCursor(offset)
    }
  }

  const loadPhotos = (after?: string) => {
    const isSyncing = getSyncingDownloadPreviews();

    if (isSyncing) {
      return Promise.resolve();
    }
    setSyncingDownloadPreviews(true);

    return Promise.race([
      loadLocalPhotos(after).then(res => loadUploadedPhotos(res))
    ]).then(result => {
      setSyncingDownloadPreviews(false);
      return result;
    })
  }

  const start = (offset?: any) => {
    setIsStart(true)
    return loadLocalPhotos().then(() => {
      loadUploadedPhotos(offset).then((res) => {
        return setRemotePhotos(localPhotos, uploadedPhotos)
      })
    })
  }

  useEffect(() => {
    setEndCursor(undefined)
    setOffsetCursor(0)
    setIsLoading(true);
    start().then(()=> { setIsStart(false)}).finally(() => { setIsLoading(false) })
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <AlbumDetailsModal />
      <AddItemToModal />

      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {props.navigation.state.params.title}
          </Text>

          <Text style={styles.photosCount}>
            {remotePhotos.length} Photos
          </Text>
        </View>

        {
          !props.photosState.isSync ?
            null
            :
            <View style={styles.containerSync}>
              <Text style={styles.syncText}>Syncing</Text>

              <View>
                <MaterialIndicator style={styles.spinner} color="#5291ff" size={15} />
              </View>
            </View>
        }
      </View>

      <View style={{ flexGrow: 1 }}>
        {
          <View>
            {
              <PhotoList
                data={remotePhotos}
                numColumns={3}
                onRefresh={() => {
                  setIsLoading(true)
                  start()
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

                  if (!isStart) {
                    start(offsetCursor)
                  }

                  //start(offsetCursor)
                }}
              />
            }
          </View>
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