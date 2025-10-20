import { ethers } from 'ethers';
import { logger } from './logger';

export const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);

export async function verifyTransaction(txHash: string): Promise<ethers.TransactionReceipt | null> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
  } catch (error) {
    logger.error('Failed to verify transaction:', error);
    return null;
  }
}

export function createWallet(): ethers.Wallet {
  return new ethers.Wallet(process.env.EAS_ATTESTATION_PRIVATE_KEY!, provider);
}