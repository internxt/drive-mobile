import Toast, { ToastShowParams } from 'react-native-toast-message';

import { NotificationData, NotificationType } from '../types';

class NotificationsService {
  private readonly notifications: NotificationData[] = [];

  private readonly defaultShowOptions: Partial<ToastShowParams> = {
    visibilityTime: 3000,
    position: 'bottom',
    autoHide: true,
    bottomOffset: 70,
  };

  public show(options: { text1: string; text2?: string; type: NotificationType }) {
    if (this.notifications.length === 0) {
      Toast.show({
        ...this.defaultShowOptions,
        text1: options.text1,
        text2: options.text2,
        type: options.type,
        onHide: () => this.onNotificationHide(),
      });
    }

    this.notifications.push(options);
  }

  private onNotificationHide() {
    this.notifications.shift();

    if (this.notifications.length > 0) {
      Toast.show({
        ...this.defaultShowOptions,
        ...this.notifications[0],
        onHide: () => this.onNotificationHide(),
      });
    }
  }
}

const notificationsService = new NotificationsService();
export default notificationsService;
