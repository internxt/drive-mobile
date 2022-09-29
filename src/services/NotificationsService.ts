import { setString } from 'expo-clipboard';
import Toast, { ToastShowParams } from 'react-native-toast-message';

import { NotificationData, NotificationType } from '../types';

class NotificationsService {
  private readonly defaultShowOptions: Partial<ToastShowParams> = {
    visibilityTime: 3000,
    position: 'bottom',
    autoHide: true,
    bottomOffset: 70,
  };
  private readonly showNextNotificationDelay = 500;
  private readonly notifications: NotificationData[] = [];

  public success(text: string) {
    this.show({ text1: text, type: NotificationType.Success });
  }

  public info(text: string) {
    this.show({ text1: text, type: NotificationType.Info });
  }

  public warning(text: string) {
    this.show({ text1: text, type: NotificationType.Warning });
  }

  public error(text: string) {
    this.show({ text1: text, type: NotificationType.Error });
  }

  public show(options: {
    text1: string;
    text2?: string;
    type: NotificationType;
    action?: { text: string; onActionPress: () => void };
  }) {
    if (this.notifications.length === 0) {
      Toast.show({
        ...this.defaultShowOptions,
        text1: options.text1,
        text2: options.text2,
        type: options.type,
        onHide: () => this.onNotificationHide(),
        props: {
          action: options.action,
        },
      });
    }

    this.notifications.push(options);
  }

  public copyText({ title, actionText, textToCopy }: { title: string; actionText: string; textToCopy: string }) {
    this.show({
      text1: title,
      type: NotificationType.Success,
      action: {
        text: actionText,
        onActionPress: () => {
          setString(textToCopy);
        },
      },
    });
  }

  private onNotificationHide() {
    this.notifications.shift();

    setTimeout(() => {
      if (this.notifications.length > 0) {
        Toast.show({
          ...this.defaultShowOptions,
          ...this.notifications[0],
          onHide: () => this.onNotificationHide(),
        });
      }
    }, this.showNextNotificationDelay);
  }
}

const notificationsService = new NotificationsService();
export const notifications = notificationsService;
export default notificationsService;
