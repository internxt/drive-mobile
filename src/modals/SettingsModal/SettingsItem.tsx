import React from 'react'
import { GestureResponderEvent, StyleSheet, Text } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler'

interface SettingsItemProps {
  onPress: (event: GestureResponderEvent) => void
  text: string
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
    justifyContent: 'center',
    paddingBottom: 15,
    paddingTop: 5,
    paddingLeft: 24
  },
  itemText: {
    color: '#000',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 19,
    fontWeight: '500',
    justifyContent: 'center'
  }
});
