import React, { useEffect, useState } from 'react'
import { StyleSheet, Image, Dimensions, View, Text } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { IPreview } from '../../components/PhotoList';
import { IHashedPhoto } from '../Home/init';

export interface ISelectivePhoto {
  photo: IPreview
  handleSelection: (selectedPhotoId: number) => void
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
    >
      <View style={isSelected ? styles.iconBackground : styles.hidden}>
        <Text>x</Text>
      </View>

      <Image style={styles.image} source={{ uri: props.photo.localUri }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: (DEVICE_WIDTH - wp('6')) / 4,
    height: (DEVICE_WIDTH - wp('6')) / 4,
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  },
  image: {
    width: (DEVICE_WIDTH - wp('6')) / 4,
    height: (DEVICE_WIDTH - wp('6')) / 4,
    borderRadius: 10
  },
  iconBackground: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 30 / 2,
    backgroundColor: '#4385F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: wp('1'),
    marginLeft: wp('1'),
    zIndex: 1
  },
  hidden: {
    display: 'none'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SelectivePhoto);