import React from 'react'
import { StyleSheet, View } from 'react-native'
import Downloading from '../../../assets/icons/photos/downloading.svg'

interface PhotoBadgeProps {
  isUploaded?: boolean
  isLocal?: boolean
}

export default function PhotoBadge(props: PhotoBadgeProps): JSX.Element {
  const showView = (props.isLocal && !props.isUploaded) || (!props.isLocal && props.isUploaded);

  return (
    <View style={styles.viewFrame}>
      {props.isLocal && !props.isUploaded
        && <Downloading width={30} height={30} />
      }
      {!props.isLocal && props.isUploaded
        && <Downloading width={30} height={30} />
      }
    </View>
  )
}

const styles = StyleSheet.create({
  viewFrame: {
  }
})