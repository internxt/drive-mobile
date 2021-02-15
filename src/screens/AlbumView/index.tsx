import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import PhotoDetailsModal from '../../modals/PhotoDetailsModal';
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
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
  const [isLoading, setIsLoading] = useState(true)
  const [images, setImages] = useState([]);

  useEffect(() => {
    setImages(props.photosState.photos)
    setIsLoading(false)
  }, [props.photosState.photos]);

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