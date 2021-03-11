import React from 'react'
import { StyleSheet, Text, View } from 'react-native';

function EmptyFolder(props: any) {
  const message = props.isRoot
    ? 'Your Internxt Drive is empty!'
    : 'This folder is empty';

  return <View style={styles.container}>
    <Text style={styles.heading}>{message}</Text>
    <Text style={styles.subheading}>Click the upload button to get started.</Text>
  </View>

}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    color: '#000000',
    fontFamily: 'CircularStd-Black',
    fontSize: 25,
    letterSpacing: -0.8,
    marginBottom: 10
  },
  subheading: {
    color: '#404040',
    fontFamily: 'CircularStd-Book',
    fontSize: 17,
    letterSpacing: -0.1,
    opacity: 0.84
  }
});

export default EmptyFolder