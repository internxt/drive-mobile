import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function EmptyPhotoList(): JSX.Element {
  return <View style={styles.emptyContainer}>
    <Text style={styles.heading}>We didn&apos;t detect any local photos on your phone.</Text>
    <Text style={styles.subheading}>Get some images to get started!</Text>
  </View>
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center'
  },
  heading: {
    color: '#000000',
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    marginVertical: 10
  },
  subheading: {
    color: '#404040',
    fontFamily: 'CircularStd-Book',
    fontSize: wp('4.1'),
    letterSpacing: -0.1,
    marginTop: 10,
    opacity: 0.84
  }
});