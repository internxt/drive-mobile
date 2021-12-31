import analytics from '@segment/analytics-react-native';
import { deviceStorage, User } from './deviceStorage';
import Firebase from '@segment/analytics-react-native-firebase';
import { NavigationState } from '@react-navigation/native';
import { NODE_ENV, REACT_NATIVE_SEGMENT_API_DEV, REACT_NATIVE_SEGMENT_API } from '@env';

export async function analyticsSetup(): Promise<void> {
  const WRITEKEY = (NODE_ENV !== 'production' ? REACT_NATIVE_SEGMENT_API_DEV : REACT_NATIVE_SEGMENT_API) as string;

  if (!WRITEKEY) {
    // This console log is neccesary to show devs if they are missing an env. variable
    // eslint-disable-next-line no-console
    console.warn('No WRITEKEY Key provided');
  }
  await analytics.setup(WRITEKEY, {
    recordScreenViews: true,
    trackAppLifecycleEvents: true,
    using: [Firebase],
  });
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
