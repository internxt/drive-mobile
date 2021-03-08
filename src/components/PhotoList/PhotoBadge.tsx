import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { getIcon } from '../../helpers/getIcon'

interface PhotoBadgeProps {
  isUploaded?: boolean
  isLocal?: boolean
}

export default function PhotoBadge(props: PhotoBadgeProps): JSX.Element {
  const showView = (props.isLocal && !props.isUploaded) || (!props.isLocal && props.isUploaded);

  return <>
    {props.isLocal
        && !props.isUploaded
        && <Image source={getIcon('photoLocal')}
          style={styles.imageIcon} />}
    {!props.isLocal && props.isUploaded
        && <Image source={getIcon('photoCloud')}
          style={styles.imageIcon} />}
  </>
}

const styles = StyleSheet.create({
  imageIcon: {
    height: 20,
    width: 25
  },
  viewFrame: {
    backgroundColor: 'black',
    borderRadius: 10,
    opacity: 0.5,
    padding: 3
  }
})