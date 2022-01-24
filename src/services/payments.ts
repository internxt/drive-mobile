import { getHeaders } from '../helpers/headers';
import { StoragePlan } from '../types';

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
