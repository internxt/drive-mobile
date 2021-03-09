import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { getIcon } from '../../helpers/getIcon'

interface PhotoBadgeProps {
  isUploaded?: boolean
  isLocal?: boolean
}

export default function PhotoBadge(props: PhotoBadgeProps): JSX.Element {
  const showView = (props.isLocal && !props.isUploaded) || (!props.isLocal && props.isUploaded);

  return <View style={styles.viewFrame}>
    {props.isLocal
      && !props.isUploaded
      && <Image source={getIcon('photoLocal')}
        style={styles.imageIcon} />}
    {!props.isLocal && props.isUploaded
      && <Image source={getIcon('photoCloud')}
        style={styles.imageIcon} />}
  </View>
}

const styles = StyleSheet.create({
  imageIcon: {
    height: 25,
    margin: 3,
    width: 25
  },
  viewFrame: {
  }
})