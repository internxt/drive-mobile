import { getHeaders } from '../../helpers/headers';

export const storageService = {
  loadAvailableProducts,
  loadAvailablePlans
};

export interface IProduct {
  id: string
  name: string
  metadata: {
    price_eur: string,
    simple_name: string,
    size_bytes: string
  }
}

async function loadAvailableProducts(): Promise<IProduct[]> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/products${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
    headers: await getHeaders()
  }).then(res => res.json()).then(res => {
    return res
  }).catch(() => [])
}

export interface IPlan {
  id: string
  interval: string
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