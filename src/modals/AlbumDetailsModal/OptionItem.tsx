import React from 'react';
import { StyleSheet, View, TouchableHighlight, Text, Image } from 'react-native';
import { getIcon } from '../../helpers/getIcon';

interface OptionItemProps {
  text: any
  onClick: any
}

function OptionItem(props: OptionItemProps) {

  const handlePress = (e: any) => {
    if (props.onClick) {
      props.onClick();
    }
  }

  const icon = getIcon(props.text.trim().toLowerCase());

  return (
    <TouchableHighlight
      underlayColor="#FFFFFF"
      style={styles.itemContainer}
      onPress={handlePress}
    >
      <View style={styles.itemView}>
        <Image source={icon} style={styles.itemImage}></Image>
        <Text style={styles.itemText}>{props.text}</Text>
      </View>
    </TouchableHighlight>
  );

}

const styles = StyleSheet.create({
  itemContainer: {
    marginTop: 20,
    paddingBottom: 13,
    paddingLeft: 24,
    justifyContent: 'center'
  },
  itemView: {
    display: 'flex',
    flexDirection: 'row'
  },
  itemText: {
    fontFamily: 'Averta-Semibold',
    fontSize: 17,
    fontWeight: 'normal',
    color: '#2a2c35',
    marginLeft: 17,
    letterSpacing: -0.09
  },
  itemImage: {
    height: 25,
    width: 25,
    resizeMode: 'contain',
    tintColor:'#0084ff'
  }
});

export default OptionItem;