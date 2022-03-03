import analytics from '@segment/analytics-react-native';
import axios from 'axios';
import { deviceStorage, User } from './asyncStorage';
import Firebase from '@segment/analytics-react-native-firebase';
import { NavigationState } from '@react-navigation/native';
import { getHeaders } from '../helpers/headers';
import _ from 'lodash';

enum TrackTypes {
  PaymentConversionEvent = 'Payment Conversion',
  CouponRedeemedEvent = 'Coupon Redeemed',
}

export async function analyticsSetup(): Promise<void> {
  const WRITEKEY = process.env.REACT_NATIVE_SEGMENT_API as string;

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
  id: string;
  type: string;
  name: string;
  currency: string;
  unitAmount: number;
  maxSpaceBytes: string;
}

export async function getCheckoutSessionById(sessionId: string): Promise<any> {
  return axios
    .get(`${process.env.REACT_NATIVE_DRIVE_API_URL}/api/stripe/session/?sessionId=${sessionId}`, {
      headers: await getHeaders(),
    })
    .then((res) => {
      return res.data;
    });
}

async function getConversionData(sessionId: string) {
  const session = await getCheckoutSessionById(sessionId);
  let conversionData = {
    traits: {},
    properties: {},
    coupon: {},
  };
  if (session.payment_status === 'paid') {
    const amount = session.amount_total * 0.01;
    const discounts = session.total_details.breakdown.discounts;
    let coupon = {};

    if (discounts.length > 0) {
      const { discount } = discounts[0];
      coupon = {
        discount_id: discount.id,
        coupon_id: discount.coupon.id,
        coupon_name: discount.coupon.name.toLowerCase(),
      };
    }

    conversionData = {
      properties: {
        price_id: session.metadata.price_id,
        email: session.customer_details.email,
        product: session.metadata.product,
        customer_id: session.customer,
        currency: session.currency.toUpperCase(),
        value: amount,
        revenue: amount,
        quantity: 1,
        type: session.metadata.type,
        plan_name: session.metadata.name,
        impact_value: amount === 0 ? 5 : amount,
        subscription_id: session.subscription,
        payment_intent: session.payment_intent,
      },
      traits: {
        email: session.customer_details.email,
        plan: session.metadata.priceId,
        customer_id: session.customer,
        storage_limit: session.metadata.maxSpaceBytes,
        plan_name: session.metadata.name,
        subscription_id: session.subscription,
        payment_intent: session.payment_intent,
      },
      coupon,
    };
  }

  return conversionData;
}

export async function trackPayment(sessionId: string): Promise<void> {
  const user = await getAnalyticsData();
  const conversionData = await getConversionData(sessionId);

  if (!_.isEmpty(conversionData.properties)) {
    await analytics.identify(user.uuid, conversionData.traits);

    analytics.track(TrackTypes.PaymentConversionEvent, conversionData.properties);

    if (!_.isEmpty(conversionData.coupon)) {
      analytics.track(TrackTypes.CouponRedeemedEvent, conversionData.coupon);
    }
  }
}

export default analytics;
