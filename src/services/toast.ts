import Toast, { ToastShowParams } from 'react-native-toast-message';

import { ToastType } from '../types';

class ToastService {
  private readonly defaultShowOptions: Partial<ToastShowParams> = {
    visibilityTime: 3000,
    position: 'bottom',
    autoHide: false,
    bottomOffset: 70,
  };

  public show(options: { text1: string; text2?: string; type: ToastType }) {
    Toast.show({
      ...this.defaultShowOptions,
      text1: options.text1,
      text2: options.text2,
      type: options.type,
    });
  }
}

const toastService = new ToastService();
export default toastService;
