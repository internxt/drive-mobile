import analytics from '@segment/analytics-react-native';
import { deviceStorage, User } from './deviceStorage';
import Firebase from '@segment/analytics-react-native-firebase';
import { NavigationState } from '@react-navigation/native';

export async function analyticsSetup(): Promise<void> {
  const WRITEKEY = (
    process.env.NODE_ENV !== 'production'
      ? process.env.REACT_NATIVE_SEGMENT_API_DEV
      : process.env.REACT_NATIVE_SEGMENT_API
  ) as string;

  if (!WRITEKEY) {
    // This console log is neccesary to show devs if they are missing an env. variable
    // eslint-disable-next-line no-console
    console.warn('No WRITEKEY Key provided');
  }
  if (!analytics.ready) {
    await analytics
      .setup(WRITEKEY, {
        recordScreenViews: true,
        trackAppLifecycleEvents: true,
        using: [Firebase],
      })
      .catch(() => undefined); // ! hotfix - Ignore analytics initialization errors (segment analytics allocated multiple times)
  }
}

export async function getAnalyticsUuid(): Promise<string> {
  const xUser: any = await getAnalyticsData();

  return xUser.uuid;
}

export async function getAnalyticsData(): Promise<User> {
  return deviceStorage.getUser();
}

export async function trackStackScreen(state: NavigationState, params?: any): Promise<void> {
  analytics.screen(state.routes[0].name, params);
}

export default analytics;
