import React from 'react'
import { Text, View } from 'react-native'
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import Back from '../../../assets/icons/photos/back.svg'
import { TouchableOpacity } from 'react-native-gesture-handler'

interface HeaderProps {
  isSyncing: boolean
  title: string
  isAlbumSelected: boolean
  setIsAlbumSelected: React.Dispatch<React.SetStateAction<boolean>>
}

const Header = ({ isSyncing, title, isAlbumSelected, setIsAlbumSelected }: HeaderProps): JSX.Element => {
  return (
    <View style={tailwind('flex-row items-center mt-4')}>
      {isAlbumSelected ?
        <View style={tailwind('w-1/5 items-start justify-center')}>
          <TouchableOpacity style={tailwind('w-12 pl-2 border')}
            onPress={() => setIsAlbumSelected(false)}
          >
            <Back width={25} height={25} />
          </TouchableOpacity>
        </View>
        :
        <View style={tailwind('w-1/5')}></View>
      }

      <Text style={tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular')}>
        {title}
      </Text>

      <View style={tailwind('w-1/5 justify-center items-end')}>
        <View style={tailwind('items-center justify-center mr-2 mb-1')}>
          <Syncing width={25} height={25} />
        </View>
      </View>
    </View>
  )
}

export default React.memo(Header);