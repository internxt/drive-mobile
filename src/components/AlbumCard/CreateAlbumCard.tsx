import * as React from 'react';
import { Image, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { getIcon } from '../../helpers/getIcon';
import { layoutActions } from '../../redux/actions';
interface ISelectedPhotos {
  path: string
  localIdentifier?: string
  sourceURL?: string
  filename?: string
  width: number
  height: number
  mime: string
  size: number
  duration: number
  data: string
  exif: any
  cropRect: any
  creationDate?: string
  modificationDate: string
  dispatch: any
}

// TODO: Add album param
function CreateAlbumCard(props: ISelectedPhotos): JSX.Element {
  const img = getIcon('create');

  return (
    <TouchableHighlight
      underlayColor="#fff"
      style={styles.albumCard}
      onPress={() => {
        props.dispatch(layoutActions.openComingSoonModal())
        /* ImagePicker.openPicker({
          multiple: true,
          maxFiles: 0
        }).then(res => {
          props.dispatch(PhotoActions.setSelectedPhotos(res))
          props.navigation.navigate('CreateAlbum')
        }).catch(() => {}) */
      }}
    >
      <View style={styles.card}>
        <Image source={img} style={{ height: 25, width: 38, backgroundColor: '#0084ff' }} />
        <Text style={{
          fontFamily: 'Averta-Semibold',
          marginTop: 14,
          fontSize: 16,
          color: 'black'
        }}>
          {strings.screens.photos.components.create_album_card}
        </Text>

      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create({
  albumCard: {
    paddingHorizontal: 20,
    paddingVertical: 15
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderColor: 'white',
    borderRadius: 9,
    borderWidth: 12,
    display: 'flex',
    elevation: 5,
    marginHorizontal: 4,
    paddingVertical: 57,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbumCard);