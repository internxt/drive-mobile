import { getHeaders } from '../helpers/headers';

export async function getCurrentIndividualPlan() {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/plan/individual`, {
    method: 'get',
    headers: await getHeaders()
  }).then(res => {
    if (res.status !== 200) {
      throw Error('Cannot load individual plan')
    }
    return res;
  }).then(res => res.json())
}