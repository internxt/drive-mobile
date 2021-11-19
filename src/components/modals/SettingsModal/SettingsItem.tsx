import React from 'react'
import { StyleSheet, Text, View, TouchableHighlight } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons'
import { getColor } from '../../../helpers/designSystem';

interface SettingsItemProps {
  onPress: () => void
  text: string | JSX.Element
  icon?: typeof Unicons
  color?: string
}

export default function SettingsItem(props: SettingsItemProps): JSX.Element {
  return <TouchableHighlight
    underlayColor="#FFFFFF"
    style={styles.itemContainer}
    onPress={props.onPress}
  >
    <View style={styles.settingsContainer}>
      {props.icon && <props.icon color={props.color? props.color : getColor('blue-60')} size={25} style={styles.icon} />}

      {typeof props.text === 'string' ? <Text style={[styles.itemText, props.color?{ color: props.color }: null]}>{props.text}</Text> : props.text}

    </View>
  </TouchableHighlight>

}

const styles = StyleSheet.create({
  settingsContainer: {
    flexDirection: 'row'
  },
  icon: {
    marginRight: 15
  },
  itemContainer: {
    justifyContent: 'center',
    paddingBottom: 8,
    paddingTop: 8,
    paddingLeft: 24,
    paddingRight: 24
  },
  itemText: {
    color: '#000',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 19,
    fontWeight: '500',
    justifyContent: 'center',
    flexGrow: 1
  }
});
