// kyberUtils.ts

import { BigNumber } from 'bignumber.js';

// Utility to convert Ether to Wei (or other tokens)
export const toWei = (ether: string): string => {
  return new BigNumber(ether).times(new BigNumber(10).pow(18)).toString();
};

// Utility to convert Wei to Ether
export const fromWei = (wei: string): string => {
  return new BigNumber(wei).div(new BigNumber(10).pow(18)).toString();
};

// Utility to calculate token rate (mock example)
export const getTokenRate = async (tokenAddress: string, amount: string): Promise<string> => {
  // Mock request to a Kyber API or contract call to fetch the token rate
  // For now, returns a fixed rate (e.g., 1 token = 0.5 Ether)
  const mockRate = new BigNumber(amount).times(0.5);
  return mockRate.toString();
};
