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
import { getLocalImages, getUploadedPhotos, syncPhotos, getPreviews, stopSync, photosUserData } from './init'
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { WaveIndicator } from 'react-native-indicators';
import ComingSoonModal from '../../modals/ComingSoonModal';
import MenuItem from '../../components/MenuItem';
import { layoutActions } from '../../redux/actions';
import { deviceStorage } from '../../helpers';

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
    await Promise.all([
      getLocalImages(props.dispatch, false),
      getUploadedPhotos(props.authenticationState, props.dispatch)
    ]).then(() => {
      setIsLoading(false)
    })
  }

  const initUser = async () =>{
    const xPhotos = await deviceStorage.getItem('xPhotos')

    if (!xPhotos) {
      photosUserData(props.authenticationState).then(async res => {
        await deviceStorage.saveItem('xPhotos', JSON.stringify(res));
        init()
      })
    }

  }

  useEffect(()=>{
    initUser()
  }, [])

  useEffect(() => {
    if (props.photosState.localPhotos) {
      syncPhotos(props.photosState.localPhotos, props)
    }
  }, [props.photosState.localPhotos])

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

      {/* <AppMenuPhotos navigation={props.navigation} /> */}

      <View style={styles.albumsContainer}>
        <View style={styles.albumsHeader}>
          <Text style={styles.title}>
          Albums
          </Text>

          <MenuItem
            name="settings"
            onClickHandler={() => {
              props.dispatch(layoutActions.openSettings());
            }} />

        </View>

        <View style={styles.createAlbumCard}>
          <CreateAlbumCard navigation={props.navigation} dispatch={props.dispatch} />
        </View>

        {/* {props.photosState.albums.length > 0 ?
          <View style={styles.titleButton}>
            <FlatList
              keyExtractor={keyExtractor}
              renderItem={renderAlbumItem}
              data={props.photosState.albums}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            ></FlatList>
          </View>
          :
          <View style={{ marginTop: 40 }}>
            <CreateAlbumCard navigation={props.navigation} />
          </View>
        } */}
      </View>

      <View style={styles.allPhotosContainer}>
        <TouchableOpacity style={styles.titleButton}
          onPress={() => {
            //getLocalImages(props.dispatch, true).then(() => {
            props.navigation.navigate('PhotoGallery', { title: 'All Photos' })
            //})
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

      {/* <View style={styles.albumsContainer}>
        <View style={styles.albumHeader}>
          <Text style={styles.title}>
          Uploaded photos
          </Text>

          <Pressable
            onPress={() => {
            }}
          >
            <Text style={styles.albumsSort}>
              {props.photosState.sortType}
            </Text>
          </Pressable>
        </View>

        <TouchableHighlight
          style={styles.titleButton}
          underlayColor="#FFF"
          onPress={() => { props.navigation.navigate('PhotoGallery', { title: 'Uploaded photos' }) }}
        >
          { props.photosState.previews ?
            <PhotoList
              title={'Uploaded photos'}
              photos={props.photosState.previews}
              navigation={props.navigation}
            />
            :
            <WaveIndicator color="#5291ff" size={50} />
          }
        </TouchableHighlight>
      </View> */}
    </SafeAreaView>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Home)

const styles = StyleSheet.create({
  container: {
    height: '100%',
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
  },
  titleButton: {
    flexDirection: 'row',
    paddingHorizontal: wp('1'),
    marginBottom: wp('1')
  },
  albumsContainer: {
    height: '40%',
    paddingVertical: wp('3.5'),
    paddingHorizontal: wp('1')
  },
  allPhotosContainer: {
    flex: 1,
    marginBottom: wp('5')
  },
  albumsHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    color: 'black',
    alignSelf: 'center',
    height: 30,
    marginLeft: 7
  },
  createAlbumCard: {

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