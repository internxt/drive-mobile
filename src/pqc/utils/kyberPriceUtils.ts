// kyberPriceUtils.ts

import { getKyberRateFromAPI } from './kyberAPI';

// Utility to fetch the price of a specific token using Kyber
export const getTokenPriceInEther = async (tokenAddress: string, amount: string): Promise<string> => {
  try {
    const rate = await getKyberRateFromAPI(tokenAddress, amount);
    // Assuming rate is in Ether, if needed apply conversion logic here
    return rate;
  } catch (error) {
    throw new Error('Failed to get token price');
  }
};

// Utility to convert token price to another token using Kyber rates
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
