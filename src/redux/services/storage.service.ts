import { getHeaders } from '../../helpers/headers';

export const storageService = {
  loadAvailableProducts,
  loadAvailablePlans
};

export interface IProduct {
  id: string
  name: string
  metadata: {
    // eslint-disable-next-line camelcase
    price_eur: string,
    // eslint-disable-next-line camelcase
    simple_name: string,
    // eslint-disable-next-line camelcase
    size_bytes: string
    // eslint-disable-next-line camelcase
    is_teams?: '1'
  },
  plans: IPlan[]
}

async function loadAvailableProducts(): Promise<IProduct[]> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/v2/stripe/products${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
    headers: await getHeaders()
  }).then(res => res.json()).catch(() => [])
}

export interface IPlan {
  id: string
  interval: string
  // eslint-disable-next-line camelcase
  interval_count: number
  name: string
  price: number
}

async function loadAvailablePlans(productId: string): Promise<IPlan[]> {
  const body = {
    product: productId,
    test: process.env.NODE_ENV === 'development'
  };

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/plans${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify(body)
  })
    .then(res => {
      return res.json()
    }).then(res => res).catch(() => [])
}