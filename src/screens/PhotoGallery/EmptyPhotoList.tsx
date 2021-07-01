import React from 'react'
import { Text } from 'react-native';
import strings from '../../../assets/lang/strings';
import { FilterTypes } from '../../library/interfaces/photos'
import { tailwind } from '../../tailwind.js'

const EmptyPhotosToRenderList = (hasPermission: boolean, selectedFilter: FilterTypes): JSX.Element => {
  if (!hasPermission) {
    return <Text style={tailwind('font-light text-center text-base')}>{strings.screens.photos.screens.photos.permission_denied}</Text>
  }

  switch (selectedFilter) {
  case FilterTypes.download:
    return <Text style={tailwind('font-light text-center text-base')}>{strings.screens.photos.screens.photos.empty_download_filter}</Text>

  case FilterTypes.upload:
    return <Text style={tailwind('font-light text-center text-base')}>{strings.screens.photos.screens.photos.empty_upload_filter}</Text>

  default:
    return <Text style={tailwind('font-light text-center text-base')}>{strings.screens.photos.screens.photos.empty_none_filter}</Text>
  }
}

export default EmptyPhotosToRenderList