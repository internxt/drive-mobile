import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { BackButton } from '../../components/BackButton';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import SelectivePhoto from './SelectivePhoto';
import { IHashedPhoto } from '../Home/init';

interface CreateAlbumProps {
  route: any;
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch,
  layoutState: LayoutState
  authenticationState?: any
}

function CreateAlbum(props: CreateAlbumProps): JSX.Element {
  const photos = props.photosState.localPhotos
  const [albumTitle, setAlbumTitle] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<IHashedPhoto[]>([])

  const handleSelection = (selectedPhoto: IHashedPhoto) => {
    const currentSelectedPhotos = selectedPhotos
    const isAlreadySelected = currentSelectedPhotos.find(photo => photo === selectedPhoto)

    if (isAlreadySelected) {
      const newSelectedPhotos = currentSelectedPhotos.filter(photo => photo === selectedPhoto ? null : photo)

      setSelectedPhotos(newSelectedPhotos)

    } else {
      currentSelectedPhotos.push(selectedPhoto)
      setSelectedPhotos(currentSelectedPhotos)
    }
  }

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
              Alert.alert('Album name: ' + albumTitle + ' | Selected photos: ' + selectedPhotos.length)
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
        <FlatList
          data={photos}
          renderItem={({ item }) => <SelectivePhoto photo={item} handleSelection={handleSelection} />}
          numColumns={4}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.flatList}
        />
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