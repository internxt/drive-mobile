import React from 'react'
import { Text, View } from 'react-native'
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'

interface HeaderProps {
  isSyncing: boolean
  title: string
}

const Header = ({ isSyncing, title }: HeaderProps): JSX.Element => {
  return (
    <View style={tailwind('flex-row items-center mt-4')}>
      <View style={tailwind('w-1/5')}></View>

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