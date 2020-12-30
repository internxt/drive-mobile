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
    style={[styles.button, props.style ? {...props.style} : {}]}>
    <Image
      style={styles.icon}
      source={imageSource} />
  </TouchableHighlight>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 10
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 25.5,
    backgroundColor: '#f7f7f7'
  },
  icon: {
    width: 25,
    height: 25,
    resizeMode: 'contain'
  }
});

export default connect(mapStateToProps)(MenuItem);