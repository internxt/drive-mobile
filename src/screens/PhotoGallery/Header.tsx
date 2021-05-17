import React from 'react'
import { Text, View } from 'react-native'
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import { connect } from 'react-redux'

interface HeaderProps {
  isSyncing: boolean
  title: string
}

const Header = ({ isSyncing, title }: HeaderProps): JSX.Element => {
  return (
    <View style={tailwind('flex-row mt-4')}>
      <View style={tailwind('w-1/5')}></View>

      <Text style={tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular')}>
        {title}
      </Text>

      <View style={tailwind('w-1/5 items-start justify-center mb-1')}>
        <Syncing width={19} height={19} />
      </View>
    </View>
  )
}

const mapStateToProps = (state: any) => {
  return {
    isSyncing: state.photosState.isSyncing
  };
};

export default connect(mapStateToProps)(Header);