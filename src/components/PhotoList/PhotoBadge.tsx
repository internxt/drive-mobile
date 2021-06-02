import React from 'react'
import { View } from 'react-native'
import CloudUploadBgBlue from '../../../assets/icons/photos/cloud-upload-bg-blue.svg'
import ArrowUp from '../../../assets/icons/photos/arrow-up-gray.svg'
import ArrowDown from '../../../assets/icons/photos/arrow-down-gray.svg'
import Tick from '../../../assets/icons/photos/tick-bg-blue.svg'
import { tailwind } from '../../tailwind'

interface PhotoBadgeProps {
  photoSelection: boolean
  isUploaded: boolean
  isLocal: boolean
  isDownloading: boolean
  isUploading: boolean
  isSelected: boolean
}

export default function PhotoBadge(props: PhotoBadgeProps): JSX.Element {
  return (
    <View style={tailwind('absolute bottom-0 right-0 mr-2 mb-2')}>
      {props.isLocal && props.isUploaded && !props.photoSelection ?
        <CloudUploadBgBlue width={22} height={22} />
        : null
      }
      {props.isDownloading && !props.photoSelection ?
        <ArrowDown width={22} height={22} />
        : null
      }
      {props.isUploading && !props.photoSelection ?
        <ArrowUp width={22} height={22} />
        : null
      }
      {props.photoSelection && props.isSelected ?
        <Tick width={22} height={22} />
        : null
      }
    </View>
  )
}