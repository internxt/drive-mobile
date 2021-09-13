import { Platform } from 'react-native'

export const platform = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: false
}
