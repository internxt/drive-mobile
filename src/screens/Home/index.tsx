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
import { getLocalImages, getUploadedPhotos, getPreviews, stopSync, initUser } from './init'
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { WaveIndicator } from 'react-native-indicators';
import ComingSoonModal from '../../modals/ComingSoonModal';
import AlbumList from '../../components/AlbumList';
import AppMenuPhotos from '../../components/AppMenu/AppMenuPhotos';

export interface IHomeProps extends Reducers {
  navigation?: any
  dispatch: any
  photosState: PhotosState
  authenticationState: AuthenticationState
}

function Home(props: IHomeProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const init = async () => {
    getPreviews(props).catch(() => {})
    Promise.all([
      getLocalImages(props.dispatch),
      getUploadedPhotos(props.authenticationState, props.dispatch)
    ]).then(() => {
      setIsLoading(false)
    })
  }

  useEffect(()=>{
    initUser().then(() => init())
  }, [])

  useEffect(() => {
    if (props.photosState.localPhotos) {
      //syncPhotos(props.photosState.localPhotos, props)
    }
  }, [props.photosState.localPhotos])

  useEffect(() => {
    if (!props.authenticationState.loggedIn) {
      stopSync()
      props.navigation.replace('Login')
    }
  }, [props.authenticationState.loggedIn])

  return (
    <SafeAreaView style={styles.mainContainer}>
      <SettingsModal navigation={props.navigation} />
      <SortModal />
      <ComingSoonModal />

      <AppMenuPhotos navigation={props.navigation} />

      <View style={styles.albumsContainer}>
        <View style={styles.albumsHeader}>
          <Text style={styles.title}>Albums</Text>
        </View>

        <View style={styles.albumCardContainer}>
          {
            props.photosState.albums.length > 0 ?
              <AlbumList navigation={props.navigation} />
              :
              <CreateAlbumCard navigation={props.navigation} />
          }
        </View>

      </View>

      <View style={styles.allPhotos}>
        <TouchableOpacity style={styles.titleButton}
          onPress={() => {
            props.navigation.navigate('PhotoGallery', { title: 'All Photos' })
          }}
          disabled={isLoading}>
          <Text style={styles.title}>All photos</Text>
        </TouchableOpacity>

        {
          !isLoading ?
            <View>
              {
                props.photosState.localPhotos.length > 0 ?
                  <PhotoList
                    title={'All Photos'}
                    photos={props.photosState.localPhotos}
                    navigation={props.navigation}
                  />
                  :
                  <View style={styles.emptyContainer}>
                    <Text style={styles.heading}>We didn&apos;t detect any local photos on your phone.</Text>
                    <Text style={styles.subheading}>Get some images to get started!</Text>
                  </View>
              }
            </View>
            :
            <View style={styles.emptyContainer}>
              <Text style={styles.heading}>Loading photos from gallery...</Text>
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

export default connect(mapStateToProps)(Home)

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  albumsContainer: {
    flex: 0.5,
    marginBottom: 24
  },
  albumsHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 5
  },
  albumCardContainer: {
    alignItems: 'center',
    width: '100%'
  },
  allPhotos: {
    flex: 0.5,
    marginBottom: wp('5')
  },
  titleButton: {
    flexDirection: 'row',
    paddingHorizontal: wp('1'),
    marginBottom: wp('1')
  },
  title: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    color: 'black',
    alignSelf: 'flex-end',
    marginLeft: wp('2')
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    color: '#000000',
    marginTop: 10,
    marginBottom: 30
  },
  subheading: {
    fontFamily: 'CircularStd-Book',
    fontSize: wp('4.1'),
    marginTop: 10,
    opacity: 0.84,
    letterSpacing: -0.1,
    color: '#404040'
  }
});