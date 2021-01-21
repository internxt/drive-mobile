import React from 'react'
import { StyleSheet, Text, View } from 'react-native';


function EmptyAlbum(props: any) {
  const message = 'Album is empty';

  return <View style={styles.container}>
    <Text style={styles.heading}>{message}</Text>
  </View>

}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    fontFamily: 'Averta-Semibold',
    fontSize: 16,
    letterSpacing: -0.8,
    color: '#000000',
    marginBottom: 10
  },
  subheading: {
    fontFamily: 'Averta-Black',
    fontSize: 17,
    opacity: 0.84,
    letterSpacing: -0.1,
    color: '#404040'
  }
});

export default EmptyAlbum