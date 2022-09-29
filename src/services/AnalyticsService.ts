import axios from 'axios';
import { NavigationState } from '@react-navigation/native';
import _ from 'lodash';
import analytics from '@rudderstack/rudder-sdk-react-native';

import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';
import asyncStorage from './AsyncStorageService';

export type JsonMap = Record<string, unknown>;
export type Options = Record<string, string | number>;

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

export class AnalyticsService {
  private config = {
    trackEnabled: false,
    trackAppLifeCycleEvents: true,
    screenTrackEnabled: true,
    identifyEnabled: false,
  };

  public getClient() {
    return analytics;
  }
  public async setup() {
    const WRITEKEY = constants.ANALYTICS_WRITE_KEY as string;

    if (!WRITEKEY) {
      // eslint-disable-next-line no-console
      console.warn('No WRITEKEY Key provided');
    }

    await analytics.setup(WRITEKEY, {
      dataPlaneUrl: constants.DATAPLANE_URL,
      recordScreenViews: this.config.screenTrackEnabled,
      trackAppLifecycleEvents: this.config.trackAppLifeCycleEvents,
    });
  }

  public identify(
    user: string,
    traits: Record<string, string | number> = {},
    options: Record<string, string | number> = {},
  ) {
    if (!this.config.identifyEnabled) return this.asNoop();
    return analytics.identify(user, traits, options);
  }

  public track(event: AnalyticsEventKey, properties?: JsonMap, options?: Options) {
    if (!this.config.trackEnabled) return this.asNoop();
    analytics.track(event, properties, options);
  }

  public screen(name: string, properties?: JsonMap, options?: Options) {
    if (!this.config.screenTrackEnabled) return this.asNoop();
    analytics.screen(name, properties, options);
  }

  public async trackStackScreen(state: NavigationState, params?: any): Promise<void> {
    if (!this.config.screenTrackEnabled) return this.asNoop();
    analytics.screen(state.routes[0].name, params);
  }

  public async getCheckoutSessionById(sessionId: string): Promise<any> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    return axios
      .get(`${constants.DRIVE_API_URL}/stripe/session/?sessionId=${sessionId}`, {
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
      await this.identify(user.uuid, conversionData.traits);

      await this.track(AnalyticsEventKey.PaymentConversionEvent, conversionData.properties);

      if (!_.isEmpty(conversionData.coupon)) {
        this.track(AnalyticsEventKey.CouponRedeemedEvent, conversionData.coupon);
      }
    }
  }

  public async testEvent() {
    await analytics.track('Test Event');
  }

  private async asNoop() {
    return;
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
