import prettysize from 'prettysize';

import analytics from './analytics';
import { getHeaders } from '../helpers/headers';
import { DevicePlatform } from '../types';
import { constants } from './app';
import { asyncStorage } from './asyncStorage';

export interface IProduct {
  id: string;
  name: string;
  metadata: {
    price_eur: string;
    simple_name: string;
    size_bytes: string;
    is_teams?: '1';
  };
  plans: IPlan[];
}
export interface IPlan {
  id: string;
  interval: string;
  interval_count: number;
  name: string;
  price: number;
}

function identifyPlanName(bytes: number): string {
  return bytes === 0 ? 'Free 10GB' : prettysize(bytes);
}

async function loadUsage(): Promise<number> {
  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/usage`, {
    method: 'get',
    headers: await getHeaders(),
  })
    .then((res) => {
      if (res.status !== 200) {
        throw Error('Cannot load usage');
      }
      return res;
    })
    .then((res) => res.json())
    .then((res) => {
      return res.total;
    });
}

async function loadLimit(): Promise<number> {
  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/limit`, {
    method: 'get',
    headers: await getHeaders(),
  })
    .then((res) => {
      if (res.status !== 200) {
        throw Error('Cannot load limit');
      }
      return res;
    })
    .then((res) => res.json())
    .then((res) => {
      return res.maxSpaceBytes;
    });
}

export async function loadValues(): Promise<{ usage: number; limit: number }> {
  const limit = await loadLimit();
  const usage = await loadUsage();
  const user = await asyncStorage.getUser();

  analytics
    .identify(user.uuid, {
      platform: DevicePlatform.Mobile,
      storage: usage,
      plan: identifyPlanName(limit),
      userId: user.uuid,
    })
    .catch(() => undefined);

  return { usage, limit };
}
