import React from 'react'
import { View } from 'react-native'
import { tailwind } from '../../tailwind'
import { TouchableOpacity } from 'react-native-gesture-handler'
import HomeBlue from '../../../assets/icons/photos/home-blue.svg'
import FolderBlue from '../../../assets/icons/photos/folder-blue.svg'
import LensThinBlue from '../../../assets/icons/photos/lens-thin-blue.svg'
import SquareWithCrossBlue from '../../../assets/icons/photos/square-with-cross-blue.svg'

interface FooterProps {
  dispatch: any
  setHeaderTitle: React.Dispatch<React.SetStateAction<string>>
}

const ICON_SIZE = 25

const Footer = (props: FooterProps): JSX.Element => {

  const FooterButton = ({ children, onPress }: { children: JSX.Element, onPress: () => void }): JSX.Element => (
    <TouchableOpacity onPress={() => onPress()} style={tailwind('w-10 h-10 items-center justify-center')}>
      {children}
    </TouchableOpacity>
  )

  return (
    <View style={tailwind('flex-row h-12 justify-between items-center my-3 pl-2')}>
      <FooterButton onPress={() => props.setHeaderTitle('INTERNXT PHOTOS')}>
        <HomeBlue width={ICON_SIZE} height={ICON_SIZE} />
      </FooterButton>

      <FooterButton onPress={() => props.setHeaderTitle('Albums')}>
        <FolderBlue width={ICON_SIZE} height={ICON_SIZE} />
      </FooterButton>

      <FooterButton onPress={() => props.setHeaderTitle('Albums')}>
        <LensThinBlue width={ICON_SIZE} height={ICON_SIZE} />
      </FooterButton>

      <FooterButton onPress={() => props.setHeaderTitle('Albums')}>
        <SquareWithCrossBlue width={ICON_SIZE} height={ICON_SIZE} />
      </FooterButton>
    </View>
  )
}

export default Footer