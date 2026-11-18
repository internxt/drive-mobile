import Toast, { ToastShowParams } from 'react-native-toast-message';

import { NotificationType } from '../types';
import { notifications as notificationsInstance } from './NotificationsService';

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const DEFAULT_VISIBILITY_TIME_MS = 3000;
const ACTION_VISIBILITY_TIME_MS = 6000;
const NEXT_NOTIFICATION_DELAY_MS = 500;

const showToastMock = Toast.show as jest.Mock;

const loadNotificationsService = (): typeof notificationsInstance => {
  let notifications = notificationsInstance;
  jest.isolateModules(() => {
    notifications = jest.requireActual('./NotificationsService').notifications;
  });
  return notifications;
};

const getShownToast = (callIndex: number): ToastShowParams => showToastMock.mock.calls[callIndex][0];

describe('Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    showToastMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('when a notification has no action, then it hides after the default time', () => {
    const notifications = loadNotificationsService();

    notifications.success('Saved');

    expect(getShownToast(0).visibilityTime).toBe(DEFAULT_VISIBILITY_TIME_MS);
  });

  test('when a notification has an action, then it stays visible longer so the user can tap it', () => {
    const notifications = loadNotificationsService();

    notifications.show({
      text1: 'Moved to trash',
      type: NotificationType.Success,
      action: { text: 'Undo', onActionPress: jest.fn() },
    });

    expect(getShownToast(0).visibilityTime).toBe(ACTION_VISIBILITY_TIME_MS);
    expect(getShownToast(0).autoHide).toBe(true);
  });

  test('when a notification is set not to hide, then it stays until dismissed', () => {
    const notifications = loadNotificationsService();

    notifications.show({
      text1: 'Moved to trash',
      type: NotificationType.Success,
      action: { text: 'Undo', onActionPress: jest.fn() },
      autoHide: false,
    });

    expect(getShownToast(0).autoHide).toBe(false);
    expect(getShownToast(0).visibilityTime).toBeUndefined();
  });

  test('when a notification with an action waits behind another one, then it keeps its action and its longer time', () => {
    const notifications = loadNotificationsService();
    const undoAction = { text: 'Undo', onActionPress: jest.fn() };

    notifications.success('Saved');
    notifications.show({ text1: 'Moved to trash', type: NotificationType.Success, action: undoAction });
    getShownToast(0).onHide?.();
    jest.advanceTimersByTime(NEXT_NOTIFICATION_DELAY_MS);

    expect(showToastMock).toHaveBeenCalledTimes(2);
    expect(getShownToast(1).text1).toBe('Moved to trash');
    expect(getShownToast(1).props).toEqual({ action: undoAction });
    expect(getShownToast(1).visibilityTime).toBe(ACTION_VISIBILITY_TIME_MS);
  });
});
