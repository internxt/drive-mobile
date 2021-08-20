import Toast from 'react-native-toast-message'

export interface custumToastParam {
  text: string,
  type: 'error' | 'success' | 'warn'
}

export function showToast(params: custumToastParam) {
  Toast.show({
    type: params.type,
    position: 'bottom',
    text1: params.text,
    visibilityTime: 5000,
    autoHide: true,
    bottomOffset: 100
  })
}