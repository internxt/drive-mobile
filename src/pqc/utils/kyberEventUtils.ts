// kyberEventUtils.ts

import { ethers } from 'ethers';

// Utility to filter Kyber transaction logs by event name
export const getKyberEventLogs = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  eventName: string,
) => {
  const contract = new ethers.Contract(
    contractAddress,
    [
      // Define event ABI for Kyber network
      'event TokenSwap(address indexed from, address indexed to, uint256 amountIn, uint256 amountOut)',
      'event TokenApproval(address indexed spender, uint256 value)',
    ],
    provider,
  );

  // Listen for the event
  contract.on(eventName, (from: string, to: string, amountIn: ethers.BigNumber, amountOut: ethers.BigNumber) => {
    console.log(`Event ${eventName} triggered`);
    console.log(`From: ${from}, To: ${to}, AmountIn: ${amountIn.toString()}, AmountOut: ${amountOut.toString()}`);
  });
};

// Utility to decode Kyber event data
export const decodeKyberEventData = (eventData: string, eventName: string) => {
  const abi = [
    'event TokenSwap(address indexed from, address indexed to, uint256 amountIn, uint256 amountOut)',
    'event TokenApproval(address indexed spender, uint256 value)',
  ];

  const iface = new ethers.utils.Interface(abi);
  const decodedData = iface.parseLog({ data: eventData, topics: [] });

  console.log(`Decoded event data for ${eventName}:`, decodedData);
  return decodedData;
};
