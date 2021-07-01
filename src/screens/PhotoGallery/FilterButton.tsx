import React from 'react'
import { Text, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { tailwind } from '../../tailwind'
import CloudDownloadWhite from '../../../assets/icons/photos/cloud-download-white.svg'
import CloudDownloadGray from '../../../assets/icons/photos/cloud-download-gray.svg'
import CloudUploadWhite from '../../../assets/icons/photos/cloud-upload-white.svg'
import CloudUploadGray from '../../../assets/icons/photos/cloud-upload-gray.svg'
import { normalize } from '../../helpers'
import { FilterTypes } from '../../library/interfaces/photos'

interface FilterButtonProps {
  width: string,
  corners: string,
  text: string,
  filter: string,
  activeFilter: FilterTypes
  handleFilterSelection?: (filterName: string) => void
}

const ICON_SIZE = normalize(17)

const FilterText = ({ text }: { text: string }) => (
  <Text style={[tailwind('text-sm text-white font-averta-light ml-2'), { fontSize: normalize(12), marginLeft: normalize(4) }]}>{text}</Text>
)
const NormalText = ({ text }: { text: string }) => (
  <Text style={[tailwind('text-sm text-gray-80 font-averta-light ml-2'), { fontSize: normalize(12), marginLeft: normalize(4) }]}>{text}</Text>
)

const FilterButton = ({ width, corners, text, filter, handleFilterSelection, activeFilter }: FilterButtonProps): JSX.Element => {

  return (
    <View style={tailwind(width)}>
      {filter === 'download' ?
        activeFilter === FilterTypes.download ?
          <TouchableOpacity
            style={tailwind(`flex-row h-8 ${corners} bg-blue-60 items-center justify-center ml-px mr-px`)}
            onPress={() => handleFilterSelection(filter)}
          >
            <View style={tailwind('flex-row')}>
              <CloudDownloadWhite width={ICON_SIZE} height={ICON_SIZE} />
              <FilterText text={text} />
            </View>
          </TouchableOpacity>
          :
          <TouchableOpacity
            style={tailwind(`flex-row h-8 ${corners} bg-white items-center justify-center ml-px mr-px`)}
            onPress={() => handleFilterSelection(filter)}
          >
            <View style={tailwind('flex-row')}>
              <CloudDownloadGray width={ICON_SIZE} height={ICON_SIZE} color='black' />
              <NormalText text={text} />
            </View>
          </TouchableOpacity>
        :
        null
      }

      {filter === 'upload' ?
        activeFilter === FilterTypes.upload ?
          <TouchableOpacity
            style={tailwind(`flex-row h-8 ${corners} bg-blue-60 items-center justify-center ml-px mr-px`)}
            onPress={() => handleFilterSelection(filter)}
          >
            <View style={tailwind('flex-row')}>
              <CloudUploadWhite width={ICON_SIZE} height={ICON_SIZE} />
              <FilterText text={text} />
            </View>
          </TouchableOpacity>
          :
          <TouchableOpacity
            style={tailwind(`flex-row h-8 ${corners} bg-white items-center justify-center ml-px mr-px`)}
            onPress={() => handleFilterSelection(filter)}
          >
            <View style={tailwind('flex-row')}>
              <CloudUploadGray width={ICON_SIZE} height={ICON_SIZE} />
              <NormalText text={text} />
            </View>
          </TouchableOpacity>
        :
        null
      }
    </View>
  )
}

export default React.memo(FilterButton)