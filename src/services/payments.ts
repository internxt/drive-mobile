import { getHeaders } from '../helpers/headers';

export enum RenewalPeriod {
  Monthly = 'monthly',
  Annually = 'annually',
  Lifetime = 'lifetime',
}

type StoragePlan = {
  planId: string;
  productId: string;
  name: string;
  simpleName: string;
  paymentInterval: RenewalPeriod;
  price: number;
  monthlyPrice: number;
  currency: string;
  isTeam: boolean;
  isLifetime: boolean;
  renewalPeriod: RenewalPeriod;
  storageLimit: number;
};

export async function getCurrentIndividualPlan(): Promise<StoragePlan> {
  return fetch(`${process.env.REACT_NATIVE_DRIVE_API_URL}/api/plan/individual`, {
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
