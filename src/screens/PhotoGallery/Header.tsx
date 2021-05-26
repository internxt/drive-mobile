import React from 'react'
import { Text, View } from 'react-native'
import { tailwind } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import TwoDotsBlue from '../../../assets/icons/photos/two-dots-blue.svg'
import { connect } from 'react-redux'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { layoutActions } from '../../redux/actions'

interface HeaderProps {
  isSyncing: boolean
  title: string
  dispatch: any
}

const Header = ({ isSyncing, title, dispatch }: HeaderProps): JSX.Element => {
  return (
    <View style={tailwind('flex-row items-center mt-4')}>
      <View style={tailwind('w-1/5')}></View>

      <Text style={tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular')}>
        {title}
      </Text>

      <View style={tailwind('w-1/5 flex-row justify-end items-center')}>
        <View style={tailwind('items-center justify-center mr-4 mb-1')}>
          <Syncing width={25} height={25} />
        </View>

        <TouchableOpacity style={tailwind('w-8 h-8 bg-white items-center justify-center rounded')}
          onPress={() => dispatch(layoutActions.openSettings())}
        >
          <TwoDotsBlue width={22} height={22} />
        </TouchableOpacity>
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