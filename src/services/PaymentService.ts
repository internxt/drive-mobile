import { Payments } from '@internxt/sdk/dist/drive';
import analytics, { AnalyticsEventKey } from './AnalyticsService';
import { constants } from './AppService';
import packageJson from '../../package.json';
import {
  CreateCheckoutSessionPayload,
  CreatePaymentSessionPayload,
  DisplayPrice,
  Invoice,
  PaymentMethod,
  UserSubscription,
} from '@internxt/sdk/dist/drive/payments/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

class PaymentService {
  private sdk: Payments | undefined;

  public initialize(accessToken: string, mnemonic: string) {
    this.sdk = Payments.client(
      `${constants.REACT_NATIVE_PAYMENTS_API_URL}`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      { token: accessToken, mnemonic },
    );
  }

  public async createSession(payload: CreatePaymentSessionPayload): Promise<{ id: string }> {
    this.checkIsInitialized();

    const response = await (<Payments>this.sdk).createSession(payload);

    analytics.track(AnalyticsEventKey.CheckoutOpened, { price_id: response.id });

    return response;
  }

  async createSetupIntent(): Promise<{ clientSecret: string }> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).getSetupIntent();
  }

  async getDefaultPaymentMethod(): Promise<PaymentMethod> {
    this.checkIsInitialized();
    return (<Payments>this.sdk).getDefaultPaymentMethod();
  }

  async getInvoices(): Promise<Invoice[]> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).getInvoices({});
  }

  async redirectToCheckout(sessionId: string) {
    const link = `${constants.REACT_NATIVE_WEB_CLIENT_URL}/checkout/${sessionId}`;

    await AsyncStorage.setItem('tmpCheckoutSessionId', sessionId);

    Linking.openURL(link);
  }

  async getUserSubscription(): Promise<UserSubscription> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).getUserSubscription();
  }

  public async getPrices(): Promise<DisplayPrice[]> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).getPrices();
  }

  public async updateSubscriptionPrice(priceId: string): Promise<UserSubscription> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).updateSubscriptionPrice(priceId);
  }

  public async cancelSubscription(): Promise<void> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).cancelSubscription();
  }

  public async createCheckoutSession(payload: CreateCheckoutSessionPayload): Promise<{ sessionId: string }> {
    this.checkIsInitialized();

    return (<Payments>this.sdk).createCheckoutSession(payload);
  }

  public getCardImage(brand: PaymentMethod['card']['brand']) {
    let image;

    switch (brand) {
      case 'amex': {
        image = require('../../assets/images/credit-cards/amex.png');
        break;
      }
      case 'diners': {
        image = require('image!../../assets/images/credit-cards/diners.png');
        break;
      }
      case 'discover': {
        image = require('../../assets/images/credit-cards/discover.png');
        break;
      }
      case 'jcb': {
        image = require('../../assets/images/credit-cards/jcb.png');
        break;
      }
      case 'mastercard': {
        image = require('../../assets/images/credit-cards/mastercard.png');
        break;
      }
      case 'unionpay': {
        image = require('../../assets/images/credit-cards/unionpay.png');
        break;
      }
      case 'visa': {
        image = require('../../assets/images/credit-cards/visa.png');
        break;
      }
      case 'unknown': {
        image = require('../../assets/images/credit-cards/unknown.png');
        break;
      }
    }

    return image;
  }

  private checkIsInitialized() {
    if (!this.sdk) {
      throw new Error('PaymentService not initialized...');
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;
