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
import { WaveIndicator } from 'react-native-indicators';
import { downloadPhoto, getLocalImages, getPreviews, IHashedPhoto } from '../Photos/init';
import _ from 'lodash'
import FileViewer from 'react-native-file-viewer'
import async from 'async'

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function setStatus(localPhotos: IHashedPhoto[], remotePhotos: IHashedPhoto[]) {
  const localPhotodLabel = _.map(localPhotos, o => _.extend({ isLocal: true }, o))
  const remotePhotosLabel = _.map(remotePhotos, o => _.extend({ isUploaded: true }, o))

  const union = _.unionBy([...localPhotodLabel, ...remotePhotosLabel], (o) => {
    const a = localPhotodLabel.find(id => id.hash === o.hash)
    const b = remotePhotosLabel.find(id => id.hash === o.hash)

    return _.merge(a, b)
  })

  return union;
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [localPhotos, setLocalPhotos] = useState<IHashedPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<IHashedPhoto[]>([]);

  const filteredPhotos = setStatus(localPhotos, uploadedPhotos);

  const loadLocalPhotos = (after?: string) => {
    return getLocalImages(after).then(res => {
      setLocalPhotos(res.assets)
      return res;
    }).then(res => {
      setIsLoading(false);
      return res;
    })
  }

  const loadUploadedPhotos = async () => {
    getPreviews().then(res => {
      setUploadedPhotos(res);
    }).then(() => {
      setIsLoading(false)
    }).catch(() => {
    })
  }

  const loadPhotos = (after?: string) => {
    return Promise.race([
      loadLocalPhotos(after),
      loadUploadedPhotos()
    ])
  }

  useEffect(() => {
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
            {props.navigation.state.params.title}
          </Text>

          <Text style={styles.photosCount}>
            {filteredPhotos.length} Photos
          </Text>
        </View>
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
                  FileViewer.open(item .localUri || '')
                }
              }}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatList}
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