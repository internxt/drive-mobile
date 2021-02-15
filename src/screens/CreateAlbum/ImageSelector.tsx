import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { PhotoActions } from '../../redux/actions';

export interface IImageSelector {
  id: string
  uri: string
  path: string
  dispatch: Dispatch
  photosState: any
}

const deviceWidth = Dimensions.get('window').width
const circleSize = 25

function ImageSelector(props: IImageSelector): JSX.Element {

  useEffect(() => {
    //console.log(props.photosState.selectedPhotosForAlbum)
  }, [props.photosState.selectedPhotosForAlbum])

  return (
    <TouchableOpacity
      key={props.id}
      onPress={() => {
      }}
      activeOpacity={0.7}
      style={styles.container}
    >
      <Image
        style={styles.image}
        source={{ uri: props.uri }}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: deviceWidth / 3,
    height: deviceWidth / 3,
    marginRight: 2,
    position: 'relative'
  },
  image: {
    width: deviceWidth / 3,
    height: deviceWidth / 3
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(ImageSelector);