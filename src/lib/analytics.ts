import analytics from '../services/analytics';

enum AnalyticsTrack {
  PaymentConversionEvent = 'Payment Conversion',
}

interface PaymentMetadata {
  maxSpaceBytes: string;
  planName: string;
  currency: string;
  unit_amount: string;
  type: string;
  name: string;
}

export async function trackPayment(
  sessionId: string,
  uuid: string,
  email: string,
  priceId: string,
  userStorageBytes: string,
  planName: string,
  paymentMetadata: {},
) {
  // 1. Call Server to get data from sessionId
  // 2. analytics
  analytics.identify(uuid, {
    email,
    plan: priceId,
    storage_limit: priceData.metadata.maxSpaceBytes,
    plan_name: priceData.metadata.name,
  });
  analytics.track(AnalyticsTrack.PaymentConversionEvent, {
    price_id: priceId,
    email,
    currency: priceData.currency.toUpperCase(),
    value: priceData.unit_amount * 0.01,
    type: priceData.type,
    plan_name: priceData.metadata.name,
  });
}
