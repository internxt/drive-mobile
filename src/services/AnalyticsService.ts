import analytics, { JsonMap } from '@segment/analytics-react-native';
import axios from 'axios';
import Firebase from '@segment/analytics-react-native-firebase';
import { NavigationState } from '@react-navigation/native';
import _ from 'lodash';

import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';
import { Options } from '@segment/analytics-react-native/build/esm/bridge';
import asyncStorage from './AsyncStorageService';

export enum AnalyticsEventKey {
  UserSignUp = 'User Signup',
  UserSignIn = 'user-sign-in',
  UserSignInAttempted = 'user-signin-attempted',
  UserSignOut = 'user-signout',
  FileUploadStart = 'file-upload-start',
  FileUploadFinished = 'file-upload-finished',
  FileUploadError = 'file-upload-error',
  FileDownloadStart = 'file-download-start',
  FileDownloadFinished = 'file-download-finished',
  FileDownloadError = 'file-download-error',
  FolderOpened = 'folder-opened',
  FolderCreated = 'folder-created',
  CheckoutOpened = 'Checkout Opened',
  PaymentConversionEvent = 'Payment Conversion',
  CouponRedeemedEvent = 'Coupon Redeemed',
  ShareTo = 'share-to',
}

class AnalyticsService {
  public async setup() {
    const WRITEKEY = constants.REACT_NATIVE_SEGMENT_API as string;

    if (!WRITEKEY) {
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

  public identify(user: string | null, traits?: JsonMap, options?: Options) {
    return analytics.identify(user, traits, options);
  }

  public track(event: AnalyticsEventKey, properties?: JsonMap, options?: Options) {
    analytics.track(event, properties, options);
  }

  public screen(name: string, properties?: JsonMap, options?: Options) {
    analytics.screen(name, properties, options);
  }

  public async trackStackScreen(state: NavigationState, params?: any): Promise<void> {
    analytics.screen(state.routes[0].name, params);
  }

  public async getCheckoutSessionById(sessionId: string): Promise<any> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    return axios
      .get(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/stripe/session/?sessionId=${sessionId}`, {
        headers: headersMap,
      })
      .then((res) => {
        return res.data;
      });
  }

  public async getConversionData(sessionId: string) {
    const session = await this.getCheckoutSessionById(sessionId);
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

  public async trackPayment(sessionId: string): Promise<void> {
    const user = await asyncStorage.getUser();
    const conversionData = await this.getConversionData(sessionId);

    if (!_.isEmpty(conversionData.properties)) {
      await analytics.identify(user.uuid, conversionData.traits);

      analytics.track(AnalyticsEventKey.PaymentConversionEvent, conversionData.properties);

      if (!_.isEmpty(conversionData.coupon)) {
        analytics.track(AnalyticsEventKey.CouponRedeemedEvent, conversionData.coupon);
      }
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
