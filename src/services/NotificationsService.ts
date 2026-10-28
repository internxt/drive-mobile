import { setStringAsync } from 'expo-clipboard';
import Toast, { ToastShowParams } from 'react-native-toast-message';

import { NotificationData, NotificationType } from '../types';

const ACTION_NOTIFICATION_VISIBILITY_TIME_MS = 6000;

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

  public show(options: NotificationData) {
    if (this.notifications.length === 0) {
      Toast.show(this.buildToastOptions(options));
    }

    this.notifications.push(options);
  }

  public copyText({ title, actionText, textToCopy }: { title: string; actionText: string; textToCopy: string }) {
    this.show({
      text1: title,
      type: NotificationType.Success,
      action: {
        text: actionText,
        onActionPress: async () => {
          await setStringAsync(textToCopy);
        },
      },
    });
  }

  private buildToastOptions(notification: NotificationData): ToastShowParams {
    const autoHide = notification.autoHide ?? true;
    const actionVisibilityOptions = notification.action
      ? { visibilityTime: ACTION_NOTIFICATION_VISIBILITY_TIME_MS }
      : {};
    const visibilityOptions: Partial<ToastShowParams> = autoHide
      ? actionVisibilityOptions
      : { autoHide: false, visibilityTime: undefined };

    return {
      ...this.defaultShowOptions,
      ...visibilityOptions,
      text1: notification.text1,
      text2: notification.text2,
      type: notification.type,
      onHide: () => this.onNotificationHide(),
      props: {
        action: notification.action,
      },
    };
  }

  private onNotificationHide() {
    this.notifications.shift();

    setTimeout(() => {
      if (this.notifications.length > 0) {
        Toast.show(this.buildToastOptions(this.notifications[0]));
      }
    }, this.showNextNotificationDelay);
  }
}

const notificationsService = new NotificationsService();
export const notifications = notificationsService;
export default notificationsService;
