import React, { useEffect, useState } from 'react'
import { StyleSheet, Image, Dimensions, View, Text } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import { IImageInfo } from 'react-native-image-zoom-viewer/built/image-viewer.type';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { IPreview } from '../../components/PhotoList';

export interface ISelectivePhoto {
  photo: IPreview
  handleSelection: (selectedPhotoId: number) => void
  handleLongPress: (selectedPhoto: IImageInfo) => void
}

const DEVICE_WIDTH = Dimensions.get('window').width

function SelectivePhoto(props: ISelectivePhoto): JSX.Element {
  const regEx = 'file:///'
  const [uri, setUri] = useState(props.photo.localUri)
  const [isSelected, setIsSelected] = useState(false)
  const photo = props.photo

  const clearSelection = () => {
    setIsSelected(false)
  }

  useEffect(() => {
    if (uri) {
      uri.match(regEx) ? null : setUri(regEx + uri)
    }
  }, [])

  return (
    <TouchableOpacity style={styles.imageContainer}
      onPress={() => {
        setIsSelected(!isSelected)
        props.handleSelection(photo.photoId)
      }}
      onLongPress={() => {
        const selectedPhoto = { url: photo.localUri }

        props.handleLongPress(selectedPhoto)
      }}
    >
      <View style={isSelected ? styles.iconBackground : styles.hidden}>
        <Text>x</Text>
      </View>

      <Image style={styles.image} source={{ uri: props.photo.localUri }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: 'none'
  },
  iconBackground: {
    alignItems: 'center',
    backgroundColor: '#4385F4',
    borderRadius: 30 / 2,
    height: 30,
    justifyContent: 'center',
    marginLeft: wp('1'),
    marginTop: wp('1'),
    position: 'absolute',
    width: 30,
    zIndex: 1
  },
  image: {
    borderRadius: 10,
    height: (DEVICE_WIDTH - wp('6')) / 4,
    width: (DEVICE_WIDTH - wp('6')) / 4
  },
  imageContainer: {
    height: (DEVICE_WIDTH - wp('6')) / 4,
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5'),
    width: (DEVICE_WIDTH - wp('6')) / 4
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SelectivePhoto);