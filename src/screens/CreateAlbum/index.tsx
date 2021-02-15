import React, { Component, useEffect, useState } from 'react';
import { Alert, Button, FlatList, Pressable, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { BackButton } from '../../components/BackButton';
import { useLinkProps, useNavigation } from '@react-navigation/native';
import PhotoItem from '../../components/PhotoItem';
import { layoutActions, photoActions } from '../../redux/actions';
import SelectPhotoModal from '../../modals/SelectPhotoModal';
import { WaveIndicator } from 'react-native-indicators'
import AlbumImage from '../PhotoGallery/AlbumImage';
import ImageSelector from './ImageSelector';

interface CreateAlbumProps {
  route: any;
  navigation?: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function CreateAlbum(props: CreateAlbumProps): JSX.Element {
  const [createStep, setCreateStep] = useState(1);
  const [inputAlbumTitle, setInputAlbumTitle] = useState('')
  const [refresh, setRefresh] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [images, setImages] = useState([]);
  let albumPhotos = props.photosState.selectedItems;

  useEffect(() => {
    setImages(props.photosState.selectedPhotosForAlbum)
    setIsLoading(false)
  }, [props.photosState.selectedPhotosForAlbum])

  useEffect(() => {
    albumPhotos = props.photosState.selectedItems;
  }, [props.photosState.selectedItems])

  useEffect(() => {
    if (props.photosState.albumContent.length > 0 && props.photosState.loading === false) {
      // When album is created, navigate to AlbumView and show new album
      // albumContent(redux) contains the content of the focused album
    }
  }, [props.photosState.loading])

  const keyExtractor = (item: any, index: any) => index;
  const renderItem = ({ item }) => (
    <PhotoItem item={item} isLoading={false} />
  );

  if (createStep === 1) {
    return (
      <View style={styles.container}>
        <SelectPhotoModal />
        <View style={styles.albumHeader}>
          <BackButton navigation={props.navigation} ></BackButton>
          <View style={{ alignSelf: 'center' }}>
            <TextInput
              style={styles.albumTitle}
              placeholder='Name your memories'
              onChangeText={value => setInputAlbumTitle(value)}
              value={inputAlbumTitle}
            />
          </View>

          <TouchableOpacity style={styles.nextBtn}
            onPress={() => {

            }}
          >
            <Text style={styles.nextText}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          Selected Photos
        </Text>

        {
          !isLoading ?
            <FlatList
              data={images}
              renderItem={({ item }) => {
                return <AlbumImage id={item.localIdentifier} uri={item.sourceURL} />
              }}
              numColumns={3}
              keyExtractor={(item, index) => index.toString()}
            />
            :
            <WaveIndicator color="#5291ff" size={50} />
        }
      </View>
    );
  }

  if (createStep === 2) {
    return (
      <View style={styles.container}>
        <SelectPhotoModal />

        <View style={styles.albumHeader}>
          <BackButton navigation={props.navigation} ></BackButton>
          <View style={{ alignSelf: 'center' }}>
            <Text style={styles.albumTitle} >
              {inputAlbumTitle}
            </Text>
          </View>
          <TouchableHighlight style={styles.nextBtn}
            onPress={() => {
              // Create album and upload device selected photos
              props.dispatch(photoActions.createAlbum(inputAlbumTitle, albumPhotos))
            }}
          >
            <Text style={styles.nextText}>
              Done
            </Text>
          </TouchableHighlight>
        </View>

        {albumPhotos.length > 0
          ? <View >
            <FlatList
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              data={albumPhotos}
              extraData={refresh}
              initialNumToRender={20}
              numColumns={3}
              contentContainerStyle={styles.items}
              horizontal={false}
            ></FlatList>
          </View>
          : <View style={styles.emptyBox}>
            <Text style={styles.emptyText}> Album is empty.</Text>
          </View>}

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff',
    paddingTop: 0,
    marginTop: 25,
    marginBottom: 0
  },
  items: {
    display: 'flex',
    justifyContent: 'center',
    paddingRight: 10
  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    paddingHorizontal: 15,
    height: '10%'
  },
  albumTitle: {
    fontFamily: 'Averta-Semibold',
    fontSize: 17,
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center'
  },
  title: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    color: 'black',
    marginLeft: 16,
    marginBottom: 16
  },
  nextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    backgroundColor: '#0084ff',
    borderRadius: 23.8
  },
  nextText: {
    color: 'white',
    fontFamily: 'Averta-Semibold',
    fontSize: 16
  },
  emptyBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '89%'
  },
  emptyText: {
    fontFamily: 'Averta-Semibold',
    fontSize: 25,
    letterSpacing: -0.09
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbum);