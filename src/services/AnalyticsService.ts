import axios from 'axios';
import { NavigationState } from '@react-navigation/native';
import analytics from '@rudderstack/rudder-sdk-react-native';

import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';
import { BaseLogger } from './common';

export type JsonMap = Record<string, unknown>;
export type Options = Record<string, string | number>;

export enum AnalyticsEventKey {
  UserSignUp = 'User Signup',
  UserSignIn = 'User Signin',
  UserSignUpFailed = 'User Signup Failed',
  UserSignInFailed = 'User Signin Failed',
  UserLogout = 'User Logout',
  PaymentConversion = 'Payment Conversion',
  TrashEmptied = 'Trash Emptied',
}

export enum DriveAnalyticsEvent {
  FileUploadStarted = 'File Upload Started',
  FileUploadCompleted = 'File Upload Completed',
  FileUploadError = 'File Upload Error',
  SharedLinkCopied = 'Shared Link Copied',
  SharedLinkDeleted = 'Shared Link Deleted',
  FileDeleted = 'File Deleted',
  FolderDeleted = 'Folder Deleted',
  FileDownloadStarted = 'File Download Started',
  FileDownloadError = 'File Download Error',
  FileDownloadCompleted = 'File Download Completed',
}
export class AnalyticsService {
  private config = {
    trackEnabled: true,
    trackAppLifeCycleEvents: true,
    screenTrackEnabled: true,
    identifyEnabled: true,
  };

  private logger = new BaseLogger({
    tag: 'DRIVE_ANALYTICS',
    disabled: !__DEV__,
  });

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
    this.logger.info('User identified');
    return analytics.identify(user, traits, options);
  }

  public track(event: AnalyticsEventKey | DriveAnalyticsEvent, properties?: JsonMap, options?: Options) {
    if (!this.config.trackEnabled) return this.asNoop();
    analytics.track(event, properties, options);
    this.logger.info(`"${event}" event tracked`);
  }

  public screen(name: string, properties?: JsonMap, options?: Options) {
    if (!this.config.screenTrackEnabled) return this.asNoop();
    this.logger.info(`"${name}" screen tracked`);
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

  public async getConversionDataProperties(sessionId: string) {
    const session = await this.getCheckoutSessionById(sessionId);

    if (session.payment_status === 'paid') {
      const amount = session.amount_total * 0.01;

      return {
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
      };
    }

    return null;
  }

  public async trackPayment(sessionId: string): Promise<void> {
    const conversionData = await this.getConversionDataProperties(sessionId);

    if (conversionData) {
      await this.track(AnalyticsEventKey.PaymentConversion, conversionData);
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
