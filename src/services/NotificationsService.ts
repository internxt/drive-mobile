import { setStringAsync } from 'expo-clipboard';
import Toast, { ToastShowParams } from 'react-native-toast-message';

import { NotificationType } from '../types';

type ShowNotificationOptions = {
  text1: string;
  text2?: string;
  type: NotificationType;
  action?: { text: string; onActionPress: () => void };
  autoHide?: boolean;
  visibilityTime?: number;
};

class NotificationsService {
  private readonly defaultShowOptions: Partial<ToastShowParams> = {
    visibilityTime: 3000,
    position: 'bottom',
    autoHide: true,
    bottomOffset: 70,
  };
  private readonly showNextNotificationDelay = 500;
  private readonly notifications: ShowNotificationOptions[] = [];

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

  public show(options: ShowNotificationOptions) {
    if (this.notifications.length === 0) {
      this.showToast(options);
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

  private onNotificationHide() {
    this.notifications.shift();

    setTimeout(() => {
      if (this.notifications.length > 0) {
        this.showToast(this.notifications[0]);
      }
    }, this.showNextNotificationDelay);
  }

  private showToast(options: ShowNotificationOptions) {
    const autoHide = options.autoHide ?? true;
    Toast.show({
      ...this.defaultShowOptions,
      ...(options.visibilityTime !== undefined ? { visibilityTime: options.visibilityTime } : {}),
      ...(autoHide ? {} : { autoHide: false, visibilityTime: undefined }),
      text1: options.text1,
      text2: options.text2,
      type: options.type,
      onHide: () => this.onNotificationHide(),
      props: {
        action: options.action,
      },
    });
  }
}

const notificationsService = new NotificationsService();
export const notifications = notificationsService;
export default notificationsService;
