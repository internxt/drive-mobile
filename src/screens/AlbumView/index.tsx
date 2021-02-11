import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import PhotoDetailsModal from '../../modals/PhotoDetailsModal';
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import FileViewer from 'react-native-file-viewer'
import AlbumImage from './AlbumImage'
interface AlbumViewProps {
  route: any;
  navigation?: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function AlbumView(props: AlbumViewProps): JSX.Element {
  const [refreshing, setRefreshing] = useState(false);
  const [images, setImages] = useState([]);

  const getImages = () => {
    return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
      .then(() => {
        return MediaLibrary.getAssetsAsync();
      })
      .then((result) => {
        return result.assets;
      });
  };

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('loading photos');
    getImages().then((res) => {
      setImages(res)
      setIsLoading(false)
    }
    );
  }, []);

  useEffect(() => {

  }, [images]);

  return (
    <View style={styles.container}>

      <AlbumDetailsModal />
      <AddItemToModal />
      <PhotoDetailsModal />

      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {props.navigation.state.params.title}
          </Text>
          <Text style={styles.photosCount}>
            {images.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      <FlatList
        data={images}
        renderItem={({ item }) => <AlbumImage id={item.id} uri={item.uri} /> }
        numColumns={3}
        //Setting the number of column
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingBottom: 15,
    marginBottom: 0
  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 45,
    paddingVertical: 7,
    paddingHorizontal: 20,
    height: '8%'
  },
  albumTitle: {
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center'

  },
  photosCount: {
    fontFamily: 'Averta-Regular',
    fontSize: 13,
    letterSpacing: 0,
    paddingTop: 5,
    color: '#bfbfbf',
    textAlign: 'center'
  },
  titleWrapper: {
    display: 'flex'
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumView);