import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { WaveIndicator } from 'react-native-indicators'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen'

interface ILoading {
  message: string
}

const Loading = (props: ILoading) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.heading}>{props.message}</Text>
    <WaveIndicator color="#5291ff" size={50} />
  </View>
)

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    marginBottom: 30,
    marginTop: 10
  }
})

export default Loading