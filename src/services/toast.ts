import Toast from 'react-native-toast-message';

export interface NotifyOptions {
  text: string;
  type: 'error' | 'success' | 'warn';
}

export function notify(params: NotifyOptions): void {
  Toast.show({
    type: params.type,
    position: 'top',
    text1: params.text,
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 48,
  });
}
