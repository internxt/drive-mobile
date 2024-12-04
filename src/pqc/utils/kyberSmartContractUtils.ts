// kyberSmartContractUtils.ts

import { ethers } from 'ethers';

// Utility to call a function on the Kyber network smart contract
export const callKyberSmartContract = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  functionName: string,
  params: any[],
) => {
  const abi = [
    'function getRate(address token, uint256 amount) public view returns (uint256)',
    'function swapTokens(address fromToken, address toToken, uint256 amount) public returns (bool)',
  ];

  const contract = new ethers.Contract(contractAddress, abi, provider);
  try {
    const result = await contract[functionName](...params);
    return result;
  } catch (error) {
    throw new Error(`Failed to call function ${functionName} on contract: ${error.message}`);
  }
};

// Utility to estimate gas for a Kyber network transaction
export const estimateGasForTransaction = async (
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  functionName: string,
  params: any[],
) => {
  const abi = ['function swapTokens(address fromToken, address toToken, uint256 amount) public returns (bool)'];

  const contract = new ethers.Contract(contractAddress, abi, provider);
  try {
    const gasEstimate = await contract.estimateGas[functionName](...params);
    return gasEstimate.toString();
  } catch (error) {
    throw new Error(`Failed to estimate gas for function ${functionName}: ${error.message}`);
  }
};
