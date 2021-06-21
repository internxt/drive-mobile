import React from 'react'
import { View } from 'react-native'
import { tailwind } from '../../tailwind'
import { TouchableOpacity } from 'react-native-gesture-handler'
import HomeBlue from '../../../assets/icons/photos/home-blue.svg'
import Albums from '../../../assets/icons/photos/albums-blue.svg'
import TwoDotsBlue from '../../../assets/icons/photos/two-dots-blue.svg'
import { layoutActions } from '../../redux/actions'

interface FooterProps {
  dispatch: any
  headerTitle: string
  setHeaderTitle: React.Dispatch<React.SetStateAction<string>>
  setSelectedFilter: React.Dispatch<React.SetStateAction<string>>
  setIsAlbumSelected: React.Dispatch<React.SetStateAction<boolean>>
}

const ICON_SIZE = 25

const Footer = ({ dispatch, headerTitle, setHeaderTitle, setSelectedFilter, setIsAlbumSelected }: FooterProps): JSX.Element => {
  const FooterButton = ({ children, onPress }: { children: JSX.Element, onPress: () => void }): JSX.Element => (
    <TouchableOpacity onPress={() => onPress()} style={tailwind('w-20 h-11 items-center justify-center relative')}>
      {children}
    </TouchableOpacity>
  )

  return (
    <View style={tailwind('flex-row h-12 justify-around items-center mt-2 pl-2')}>
      <FooterButton onPress={() => {
        setSelectedFilter('none')
        setHeaderTitle('INTERNXT PHOTOS')
        setIsAlbumSelected(false)
      }}>
        <View style={headerTitle === 'INTERNXT PHOTOS' ? tailwind('items-center justify-center w-12 h-12 bg-blue-20 rounded-full') : ''}>
          <HomeBlue width={ICON_SIZE} height={ICON_SIZE} />
        </View>
      </FooterButton>

      <FooterButton onPress={() => {
        setHeaderTitle('Albums')
      }}>
        <View style={headerTitle === 'Albums' ? tailwind('items-center justify-center w-12 h-12 bg-blue-20 rounded-full') : ''}>
          <Albums width={ICON_SIZE} height={ICON_SIZE} />
        </View>
      </FooterButton>

      <FooterButton onPress={() => dispatch(layoutActions.openSettings())}>
        <TwoDotsBlue width={ICON_SIZE} height={ICON_SIZE} />
      </FooterButton>
    </View>
  )
}

export default React.memo(Footer)