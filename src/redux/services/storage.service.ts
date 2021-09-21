export const storageService = { };

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
export interface IPlan {
  id: string
  interval: string
  // eslint-disable-next-line camelcase
  interval_count: number
  name: string
  price: number
}
