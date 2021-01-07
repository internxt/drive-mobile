import React from 'react'
import { GestureResponderEvent, StyleSheet, Text } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler'

interface SettingsItemProps {
  onPress: (event: GestureResponderEvent) => void
  text: JSX.Element
}

export default function SettingsItem(props: SettingsItemProps): JSX.Element {
  return <TouchableHighlight
    underlayColor="#FFFFFF"
    style={styles.itemContainer}
    onPress={props.onPress}
  >
    <Text style={styles.itemText}>{props.text}</Text>
  </TouchableHighlight>

}

const styles = StyleSheet.create({
  itemContainer: {
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 24,
    justifyContent: 'center'
  },
  itemText: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 19,
    fontWeight: '500',
    color: '#000',
    justifyContent: 'center'
  }
});