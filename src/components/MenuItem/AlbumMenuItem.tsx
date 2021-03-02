import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';

interface AlbumMenuItemProps {
  name?: string
  onClickHandler?: any
  style?: any
}

function AlbumMenuItem(props: AlbumMenuItemProps) {
  const imageSource = getIcon(props.name)

  return <TouchableHighlight
    underlayColor="#fff"
    onPress={props.onClickHandler}
    style={[styles.button, props.style ? { ...props.style } : {}]}>
    <Image
      style={styles.icon}
      source={imageSource} />
  </TouchableHighlight>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

const styles = StyleSheet.create({
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 25.5
  },
  icon: {
    width: 25,
    height: 25,
    resizeMode: 'contain'
  }
});

export default connect(mapStateToProps)(AlbumMenuItem);