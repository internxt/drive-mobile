import React from 'react'
import { View } from 'react-native'
import DownloadingPhoto from '../../../assets/icons/photos/downloading-photo.svg'
import UploadingPhoto from '../../../assets/icons/photos/uploading-photo.svg'
import Tick from '../../../assets/icons/photos/tick-bg-blue.svg'
import CloudFail from '../../../assets/icons/photos/cloud-fail.svg'
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
  const ICON_SIZE = 20

  const Icon = (): JSX.Element => {
    switch (true) {
    case props.isSelected:
      return <Tick width={ICON_SIZE} height={ICON_SIZE} />

    case props.isDownloading:
      return <DownloadingPhoto width={ICON_SIZE} height={ICON_SIZE} />

    case props.isUploading:
      return <UploadingPhoto width={ICON_SIZE} height={ICON_SIZE} />

    case !props.isUploaded:
      return <CloudFail width={ICON_SIZE} height={ICON_SIZE} />

    default:
      return <View></View>
    }
  }

  return (
    <View style={tailwind('absolute bottom-0 right-0 mr-2 mb-2 z-20')}>
      <Icon />
    </View>
  )
}