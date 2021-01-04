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

function loadAvailableProducts(userToken: string): Promise<IProduct[]> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/products${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
    headers: getHeaders(userToken)
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

function loadAvailablePlans(userToken: string, productId: string): Promise<IPlan[]> {
  const body = {
    product: productId,
    test: process.env.NODE_ENV === 'development'
  };

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/stripe/plans${(process.env.NODE_ENV === 'development' ? '?test=true' : '')}`, {
    method: 'post',
    headers: getHeaders(userToken),
    body: JSON.stringify(body)
  })
    .then(res => {
      return res.json()
    }).then(res => res).catch(() => [])
}