import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, SafeAreaView } from 'react-native'
import { connect } from 'react-redux';
import { TouchableOpacity } from 'react-native-gesture-handler';
import SortModal from '../../modals/SortModal';
import { Reducers } from '../../redux/reducers/reducers';
import PhotoList from '../../components/PhotoList';
import CreateAlbumCard from '../../components/AlbumCard/CreateAlbumCard';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import SettingsModal from '../../modals/SettingsModal';
import { stopSync, initUser, getLocalImages, IHashedPhoto, syncPhotos } from './init'
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { WaveIndicator, MaterialIndicator } from 'react-native-indicators';
import ComingSoonModal from '../../modals/ComingSoonModal';
import MenuItem from '../../components/MenuItem';
import { layoutActions } from '../../redux/actions';
import strings from '../../../assets/lang/strings';

export interface IPhotosProps extends Reducers {
  navigation?: any
  dispatch: any
  photosState: PhotosState
  authenticationState: AuthenticationState,
}

function Photos(props: IPhotosProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [photos, setPhotos] = useState<IHashedPhoto[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);

  const getNextImages = (after?: string | undefined) => {
    getLocalImages(after).then(res => {
      setEndCursor(res.endCursor);
      setPhotos(after ? photos.concat(res.assets) : res.assets)
      syncPhotos(res.assets, props.dispatch)
    }).finally(() => setIsLoading(false));
  }

  const reloadLocalPhotos = () => {
    initUser().finally(() => getNextImages());
  };

  useEffect(() => {
    setPhotos([])
    reloadLocalPhotos();
  }, [])

  useEffect(() => {
    if (!props.authenticationState.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.authenticationState.loggedIn])

  return (
    <SafeAreaView style={styles.container}>
      <SettingsModal navigation={props.navigation} />
      <SortModal />
      <ComingSoonModal />

      <View style={styles.albumsContainer}>
        <View style={styles.albumsHeader}>
          <Text style={styles.title}>{strings.screens.photos.screens.photos.albums}</Text>

          <MenuItem
            name="settings"
            onClickHandler={() => {
              props.dispatch(layoutActions.openSettings());
            }} />

        </View>

        <View style={styles.createAlbumCard}>
          <CreateAlbumCard navigation={props.navigation} dispatch={props.dispatch} />
        </View>

      </View>

      <View style={styles.allPhotosContainer}>
        <TouchableOpacity style={styles.titleButton}
          onPress={() => {
            props.navigation.navigate('PhotoGallery', { title: 'All Photos' })
          }}
          disabled={isLoading}>
          <Text style={styles.title}>{strings.screens.photos.screens.photos.all_photos}</Text>
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
        </TouchableOpacity>
        {
          !isLoading ?
            <View style={{ flexGrow: 1 }}>
              <PhotoList
                title={'All Photos'}
                data={photos}
                navigation={props.navigation}
                onRefresh={() => getNextImages()}
                onEndReached={() => getNextImages(endCursor)}
              />
            </View>
            :
            <View style={styles.emptyContainer}>
              <Text style={styles.heading}>{strings.screens.photos.components.loading}</Text>
              <WaveIndicator color="#5291ff" size={50} />
            </View>
        }
      </View>
    </SafeAreaView>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Photos)

const styles = StyleSheet.create({
  albumsContainer: {
    height: '45%',
    paddingHorizontal: wp('1'),
    paddingVertical: wp('3.5')
  },
  albumsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between'
  },
  allPhotosContainer: {
    flex: 1,
    marginBottom: wp('5')
  },
  container: {
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'flex-start'
  },
  containerSync: {
    flexDirection: 'row',
    marginRight: 8
  },
  createAlbumCard: {

  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    color: '#000000',
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    marginBottom: 30,
    marginTop: 10
  },
  spinner: {
  },
  syncText: {
    color: 'grey',
    fontFamily: 'Averta-Bold',
    marginRight: 8
  },
  title: {
    alignSelf: 'center',
    color: 'black',
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    marginLeft: 7
  },
  titleButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: wp('1'),
    paddingHorizontal: wp('1')
  }
});