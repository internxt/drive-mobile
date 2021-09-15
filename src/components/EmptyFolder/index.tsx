import React from 'react'
import { StyleSheet, Text, View } from 'react-native';
import strings from '../../../assets/lang/strings';
import { Reducers } from '../../redux/reducers/reducers';

interface EmptyFolderProps extends Reducers {
  isRoot: boolean
}

function EmptyFolder(props: EmptyFolderProps): JSX.Element {
  const message = props.isRoot
    ? 'Your Internxt Drive is empty!'
    : strings.components.empty_folder.title

  return <View style={styles.container}>
    <Text style={styles.heading}>{message}</Text>
    <Text style={styles.subheading}>{strings.components.empty_folder.subtitle}</Text>
  </View>

}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Black',
    fontSize: 25,
    letterSpacing: -0.8,
    marginBottom: 10
  },
  subheading: {
    color: '#404040',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 17,
    letterSpacing: -0.1,
    opacity: 0.84
  }
});

export default EmptyFolder