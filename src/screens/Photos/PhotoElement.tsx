import CameraRoll from '@react-native-community/cameraroll';
import React from 'react';
import { TouchableOpacity, Image, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import { tailwind } from '../../helpers/designSystem';
import { Reducers } from '../../redux/reducers/reducers';

interface PhotoElementProps extends Reducers {
  item: CameraRoll.PhotoIdentifier
}

function PhotoElement(props: PhotoElementProps) {
  const screenWidth = Dimensions.get('window').width;
  const thirdWidth = screenWidth / 3;

  return <TouchableOpacity
    onPress={() => {
      props.navigation.push('Preview', { uri: props.item.node.image.uri })
    }}
    key={props.item.node.image.uri}
    style={[tailwind('p-0.5'), { width: thirdWidth, height: thirdWidth }]}>
    <Image
      style={tailwind('w-full h-full')}
      source={{
        uri: props.item.node.image.uri
      }} />
  </TouchableOpacity>
}

const mapStateToProps = (state: Reducers) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoElement)
