import React from 'react'
import { GestureResponderEvent, StyleSheet, Text } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler'

interface SettingsItemProps {
  onPress: (event: GestureResponderEvent) => void
  text: string
  isUpgrade: boolean
}

export default function SettingsItem(props: SettingsItemProps): JSX.Element {
  return <TouchableHighlight
    underlayColor="#FFFFFF"
    style={styles.itemContainer}
    onPress={props.onPress}
  >
    {props.isUpgrade ?
        <Text style={styles.upgrade}>{props.text}</Text>
        : <Text style={styles.itemText}>{props.text}</Text>
      }
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
    fontFamily: 'Averta-Regular',
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    justifyContent: 'center'
  },
  upgrade: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#0084ff',
    letterSpacing: 0.4,
    justifyContent: 'center',
    marginTop: 7
  }
});
