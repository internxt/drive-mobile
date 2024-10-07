// kyberPriceUtils.ts

import { getKyberRateFromAPI } from './kyberAPI';

export const getTokenPriceInEther = async (tokenAddress: string, amount: string): Promise<string> => {
  try {
    const rate = await getKyberRateFromAPI(tokenAddress, amount);

    return rate;
  } catch (error) {
    throw new Error('Failed to get token price');
  }
};

export const convertTokenPrice = async (
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
): Promise<string> => {
  const fromTokenRate = await getKyberRateFromAPI(fromTokenAddress, amount);
  const toTokenRate = await getKyberRateFromAPI(toTokenAddress, amount);

  const convertedPrice = new BigNumber(amount).times(fromTokenRate).div(toTokenRate).toString();
  return convertedPrice;
};
