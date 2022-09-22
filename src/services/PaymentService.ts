import analytics, { AnalyticsEventKey } from './AnalyticsService';
import { constants } from './AppService';
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
import { SdkManager } from '@internxt-mobile/services/common';

class PaymentService {
  private sdk: SdkManager;
  constructor(sdkManager: SdkManager) {
    this.sdk = sdkManager;
  }

  public async createSession(payload: CreatePaymentSessionPayload): Promise<{ id: string }> {
    const response = await this.sdk.payments.createSession(payload);

    analytics.track(AnalyticsEventKey.CheckoutOpened, { price_id: response.id });

    return response;
  }

  async createSetupIntent(): Promise<{ clientSecret: string }> {
    return this.sdk.payments.getSetupIntent();
  }

  async getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
    try {
      return await this.sdk.payments.getDefaultPaymentMethod();
    } catch (error) {
      this.catchUserNotFoundError(error as Error);
      return null;
    }
  }

  async getInvoices(): Promise<Invoice[] | null> {
    try {
      return await this.sdk.payments.getInvoices({});
    } catch (error) {
      this.catchUserNotFoundError(error as Error);
      return null;
    }
  }

  async redirectToCheckout(sessionId: string) {
    const link = `${constants.WEB_CLIENT_URL}/checkout/${sessionId}`;

    await AsyncStorage.setItem('tmpCheckoutSessionId', sessionId);

    Linking.openURL(link);
  }

  async getUserSubscription(): Promise<UserSubscription> {
    try {
      return this.sdk.payments.getUserSubscription();
    } catch (error) {
      this.catchUserNotFoundError(error as Error);
    }
    return { type: 'free' };
  }

  public async getPrices(): Promise<DisplayPrice[]> {
    return this.sdk.payments.getPrices();
  }

  public async updateSubscriptionPrice(priceId: string): Promise<UserSubscription> {
    return this.sdk.payments.updateSubscriptionPrice(priceId);
  }

  public async cancelSubscription(): Promise<void> {
    return this.sdk.payments.cancelSubscription();
  }

  public async createCheckoutSession(payload: CreateCheckoutSessionPayload): Promise<{ sessionId: string }> {
    return this.sdk.payments.createCheckoutSession(payload);
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

  private catchUserNotFoundError(error: Error) {
    // The SDK throws this as an error when server sends a 404
    if (error && error.message !== '{"message":"User not found"}') {
      throw error;
    }
  }
}

export default new PaymentService(SdkManager.getInstance());
