import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Platform, FlatList, Pressable } from 'react-native'
import { layoutActions } from '../../redux/actions';
import { connect } from 'react-redux';
import { TouchableHighlight, TouchableOpacity } from 'react-native-gesture-handler';
import SortModal from '../../modals/SortModal';
import { Reducers } from '../../redux/reducers/reducers';
import AlbumCard from '../../components/AlbumCard';
import PhotoList from '../../components/PhotoList';
import CreateAlbumCard from '../../components/AlbumCard/CreateAlbumCard';
import AppMenuPhotos from '../../components/AppMenu/AppMenuPhotos';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import SettingsModal from '../../modals/SettingsModal';
import { Dispatch } from 'redux';
import { getLocalImages, getUploadedPhotos, syncPhotos, getPreviews } from './init'
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { WaveIndicator } from 'react-native-indicators';

export interface IHomeProps extends Reducers {
  navigation?: any
  dispatch: Dispatch
  photosState: PhotosState
  authenticationState: AuthenticationState
}

function Home(props: IHomeProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const init = async () => {
    await Promise.all([
      getLocalImages(props.dispatch),
      getUploadedPhotos(props.authenticationState, props.dispatch)
    ]).then(() => {
      setIsLoading(false)
    })
  }

  useEffect(() => {
    init()
    getPreviews(props)
  }, []);

  useEffect(() => {
    if (props.photosState.localPhotos) {
      //syncPhotos(props.photosState.localPhotos, props)
    }
  }, [props.photosState.localPhotos]);

  return (
    <View style={styles.container}>
      <SettingsModal navigation={props.navigation} />
      <SortModal />

      <View style={styles.platformSpecificHeight}></View>

      <AppMenuPhotos navigation={props.navigation} />

      <View style={styles.albumsContainer}>
        <View style={styles.albumsHeader}>
          <Text style={styles.albumsTitle}>
          Albums
          </Text>

          <Pressable
            onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
          >
            <Text style={styles.albumsSort}>{props.photosState.sortType}</Text>
          </Pressable>

        </View>

        {props.photosState.albums.length > 0 ?
          <View style={styles.photoScroll}>
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
        }
      </View>

      <View style={styles.albumsContainer}>
        <View style={styles.albumHeader}>
          <Text style={styles.albumsTitle}>
          All photos
          </Text>

          <Pressable
            onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
          >
            <Text style={styles.albumsSort}>
              {props.photosState.sortType}
            </Text>
          </Pressable>
        </View>

        <TouchableOpacity
          style={styles.photoScroll}
          onPress={() => {
            props.navigation.navigate('PhotoGallery', { title: 'All Photos' })
          }}
          disabled={isLoading}
        >
          <PhotoList
            title={'All Photos'}
            photos={props.photosState.localPhotos}
            navigation={props.navigation}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.albumsContainer}>
        <View style={styles.albumHeader}>
          <Text style={styles.albumsTitle}>
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
          style={styles.photoScroll}
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
      </View>

      {/* <View style={styles.albumsContainer}>
        <TouchableHighlight underlayColor="#FFF">
          <View style={styles.albumHeader}>
            <Text style={styles.albumsTitle}>
              Deleted
            </Text>
            <Pressable
              onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
            >
              <Text style={styles.albumsSort}>
                {props.photosState.sortType}
              </Text>
            </Pressable>
          </View>
        </TouchableHighlight>
      </View> */}
    </View>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Home)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
  },
  photoScroll: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 25,
    paddingHorizontal: wp('1')
  },
  albumsContainer: {
    display: 'flex',
    paddingHorizontal: 0,
    paddingVertical: 10

  },
  albumsHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 10

  },
  albumHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10
  },
  albumsTitle: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    paddingTop: 10,
    color: 'black',
    alignSelf: 'flex-start',
    height: 30
  },
  albumsSort: {
    fontFamily: 'Averta-Semibold',
    fontSize: 14,
    letterSpacing: -0.13,
    paddingTop: 10,
    color: '#bfbfbf',
    alignSelf: 'flex-end',
    height: 30,
    width: 50
  },
  platformSpecificHeight: {
    height: Platform.OS === 'ios' ? '5%' : '0%'
  }
});