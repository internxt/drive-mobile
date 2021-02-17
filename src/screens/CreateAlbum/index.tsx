import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import SelectPhotoModal from '../../modals/SelectPhotoModal';
import { WaveIndicator } from 'react-native-indicators'
import AlbumImage from '../PhotoGallery/Photo';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { ImageOrVideo } from 'react-native-image-crop-picker';
import { Dispatch } from 'redux';
import { PhotoActions } from '../../redux/actions/photo.actions';
import Photo from '../PhotoGallery/Photo';

interface CreateAlbumProps {
  route: any;
  navigation?: any
  photosState?: PhotosState
  dispatch: Dispatch,
  layoutState?: any
  authenticationState?: any
}

function CreateAlbum(props: CreateAlbumProps): JSX.Element {
  const [albumTitle, setAlbumTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [images, setImages] = useState<ImageOrVideo[]>([]);

  useEffect(() => {
    if (props.photosState) {
      setImages(props.photosState.selectedPhotosForAlbum)
      setIsLoading(false)
    }
  }, [props.photosState && props.photosState.selectedPhotosForAlbum])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} ></BackButton>

        <TextInput
          style={styles.albumTitle}
          placeholder='Name your memories'
          onChangeText={value => setAlbumTitle(value)}
          value={albumTitle}
          autoCapitalize='none'
        />

        <TouchableOpacity style={styles.nextBtn}
          onPress={() => {
            if (albumTitle) {
              //console.log(images[0])

              //props.dispatch(PhotoActions.)
            } else {
              Alert.alert('Album name is required')
            }
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
              return <Photo id={item.localIdentifier} uri={item.sourceURL} />
            }}
            numColumns={3}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.flatList}
          />
          :
          <WaveIndicator color="#5291ff" size={50} />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff'
  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15
  },
  albumTitle: {
    fontFamily: 'Averta-Semibold',
    fontSize: 17,
    color: '#000000',
    textAlign: 'center'
  },
  title: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    color: 'black',
    marginLeft: 16,
    marginVertical: 16
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
  flatList: {
    paddingHorizontal: wp('1')
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbum);