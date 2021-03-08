import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import PhotoList, { IPreview } from '../../components/PhotoList';
import { WaveIndicator } from 'react-native-indicators';
import { getLocalImages, getUploadedPhotos } from '../Photos/init';

interface PhotoGalleryProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

function PhotoGallery(props: PhotoGalleryProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [photosToRender, setPhotosToRender] = useState<IPreview[]>([])

  const loadLocalPhotos = (after?: string) => {
    getLocalImages(after)
  }

  const loadUploadedPhotos = () => {
    getUploadedPhotos()
  }

  const loadPhotos = () => {
    return loadLocalPhotos();
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
            {photosToRender.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      <View style={{ flexGrow: 1 }}>
        {
          !isLoading ?
            <PhotoList
              data={photosToRender}
              numColumns={4}
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
    justifyContent: 'space-between',
    paddingBottom: 15,
    paddingHorizontal: 20
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