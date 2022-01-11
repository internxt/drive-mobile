import analytics from '@segment/analytics-react-native';
import axios from 'axios';
import { deviceStorage, User } from './deviceStorage';
import Firebase from '@segment/analytics-react-native-firebase';
import { NavigationState } from '@react-navigation/native';
import { getHeaders } from '../helpers/headers';

enum TrackTypes {
  PaymentConversionEvent = 'Payment Conversion',
}

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

interface Plan {
  id: string
  type: string
  name: string
  currency: string
  unitAmount: number
  maxSpaceBytes: string
}

export async function getCheckoutSessionById(sessionId: string): Promise<any> {
  return axios.get(`${process.env.REACT_NATIVE_DRIVE_API_URL}/api/stripe/session/?sessionId=${sessionId}`, {
    headers: await getHeaders(),
  }).then((res) => {
    return res.data;
  });
}

export async function trackPayment(plan: Plan): Promise<void> {
  const user = await getAnalyticsData();

  await analytics.identify(user.uuid, {
    email: user.email,
    plan: plan.id,
    storage_limit: plan.maxSpaceBytes,
    plan_name: plan.name
  });

  await analytics.track(TrackTypes.PaymentConversionEvent, {
    price_id: plan.id,
    email: user.email,
    currency: plan.currency.toUpperCase(),
    value: plan.unitAmount * 0.01,
    type: plan.type,
    plan_name: plan.name,
  });
}

export default analytics;
