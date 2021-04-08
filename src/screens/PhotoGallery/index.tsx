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
import { WaveIndicator, MaterialIndicator } from 'react-native-indicators';
import { cachePicture, downloadPhoto, getLocalImages, getPreviews, IHashedPhoto, LocalImages } from '../Photos/init';
import _ from 'lodash'
import FileViewer from 'react-native-file-viewer'
import async from 'async'
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
  const localPhotodLabel = _.map(localPhotos, o => _.extend({ isLocal: true, galleryUri: o.localUri }, o))
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))

  const union = _.unionBy([...localPhotodLabel, ...remotePhotosLabel], (o) => {
    const a = localPhotodLabel.find(id => id.hash === o.hash)
    const b = remotePhotosLabel.find(id => id.hash === o.hash)

    return _.merge(a, b);
  })

  return union;
}

async function checkExists(photos: IHashedPhoto[]) {
  return async.filter(photos, (photo, nextPhoto) => {
    if (!photo.localUri) {
      return false;
    }
    RNFS.exists(photo.localUri).then((exists) => {
      nextPhoto(null, exists);
    }).catch((err) => nextPhoto(err));
  })
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [localPhotos, setLocalPhotos] = useState<IHashedPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<IHashedPhoto[]>([]);
  const [isDownloading, setIsDownloading] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const filteredPhotos = setStatus(localPhotos, uploadedPhotos);
  const [isUploading, setIsUploading] = useState(true);

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

  const loadUploadedPhotos = async (matchImages?: LocalImages) => {
    setIsDownloading(true);
    getPreviews(matchImages).then(res => {
      setUploadedPhotos(res)
    }).then(() => {
      setIsLoading(false)
    }).catch(() => {
    }).finally(() => {
      setIsDownloading(false);
    })
  }

  const loadPhotos = (after?: string) => {
    return Promise.race([
      loadLocalPhotos(after).then(res => loadUploadedPhotos(res))
    ])
  }

  useEffect(() => {
    setEndCursor(undefined)
    setIsLoading(true);
    loadPhotos();
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
            {filteredPhotos.length} {strings.screens.photos.screens.photo_gallery.subtitle}
          </Text>
        </View>

        {
          !isUploading ?
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
          !isLoading ?
            <PhotoList
              data={filteredPhotos}
              numColumns={3}
              onRefresh={() => {
                setIsLoading(true);
                loadPhotos().finally(() => setIsLoading(false));
              }}
              onItemPress={(event, item) => {
                if (item.isUploaded && !item.isLocal) {
                  downloadPhoto(item).then(x => {
                    loadPhotos();
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
              onEndReached={() => loadPhotos(endCursor)}
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