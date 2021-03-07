import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';

interface MenuItemProps {
  name?: string
  onClickHandler?: any
  style?: any
}

function MenuItem(props: MenuItemProps) {
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
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 25.5,
    display: 'flex',
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  icon: {
    height: 25,
    resizeMode: 'contain',
    width: 25
  }
});

export default connect(mapStateToProps)(MenuItem);