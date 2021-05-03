import React from 'react'
import { GestureResponderEvent, StyleSheet, Text } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler'

interface SettingsItemPhotosProps {
  onPress: (event: GestureResponderEvent) => void
  text: string
  isUpgrade: boolean
}

export default function SettingsItemPhotos(props: SettingsItemPhotosProps): JSX.Element {
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
    justifyContent: 'center',
    paddingBottom: 13,
    paddingLeft: 24,
    paddingTop: 13
  },
  itemText: {
    color: '#000',
    fontFamily: 'Averta-Regular',
    fontSize: 18,
    fontWeight: '500',
    justifyContent: 'center'
  },
  upgrade: {
    color: '#0084ff',
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    fontWeight: '700',
    justifyContent: 'center',
    letterSpacing: 0.4,
    marginTop: 7
  }
});