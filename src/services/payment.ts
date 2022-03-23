import { getHeaders } from '../helpers/headers';
import { StoragePlan } from '../types';
import analytics, { AnalyticsEventKey } from './analytics';
import { constants } from './app';

class PaymentService {
  public async createSession(body: {
    plan: string;
    test: boolean;
    successUrl: string;
    canceledUrl: string;
    isMobile: boolean;
  }) {
    const response = await fetch(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api/stripe/session${
        constants.NODE_ENV === 'development' ? '?test=true' : ''
      }`,
      {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(body),
      },
    );
    analytics.track(AnalyticsEventKey.CheckoutOpened, { price_id: body.plan });

    return response;
  }

  public async getCurrentIndividualPlan(): Promise<StoragePlan> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/plan/individual`, {
      method: 'get',
      headers: await getHeaders(),
    })
      .then((res) => {
        if (res.status !== 200) {
          throw Error('Cannot load individual plan');
        }
        return res;
      })
      .then((res) => res.json());
  }
}

const paymentService = new PaymentService();
export default paymentService;
