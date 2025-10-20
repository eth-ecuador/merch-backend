import { ethers } from 'ethers';
import { Attestation } from '../models/Attestation';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { provider, createWallet, verifyTransaction } from '../utils/blockchain';
import { CONTRACT_ADDRESSES, EAS_INTEGRATION_ABI } from '../config/contracts';

export class AttestationService {
  private wallet: ethers.Wallet;
  private easContract: ethers.Contract;
  
  constructor() {
    this.wallet = createWallet();
    this.easContract = new ethers.Contract(
      CONTRACT_ADDRESSES.easIntegration,
      EAS_INTEGRATION_ABI,
      this.wallet
    );
  }
  
  /**
   * Create an EAS attestation after successful on-chain transaction
   */
  async createAttestation(
    txHash: string,
    walletAddress: string,
    eventId: string,
    isPremium: boolean
  ) {
    logger.info('Creating EAS attestation', { txHash, walletAddress, eventId, isPremium });
    
    // Step 1: Verify transaction
    const receipt = await verifyTransaction(txHash);
    
    if (!receipt) {
      throw new ApiError(400, 'TX_NOT_FOUND', 'Transaction hash not found on Base Sepolia.');
    }
    
    if (receipt.status !== 1) {
      throw new ApiError(400, 'TX_FAILED', 'The provided transaction has failed or reverted.');
    }
    
    // Step 2: Extract token ID from logs
    const tokenId = await this.extractTokenIdFromReceipt(receipt);
    
    if (tokenId === null) {
      throw new ApiError(400, 'TX_INVALID', 'Could not extract token ID from transaction.');
    }
    
    // Step 3: Create attestation on-chain
    try {
      logger.info('Calling EAS contract to create attestation');
      
      const tx = await this.easContract.createAttendanceAttestation(
        eventId,
        walletAddress,
        tokenId,
        isPremium
      );
      
      logger.info('Waiting for attestation transaction', { txHash: tx.hash });
      
      const attestationReceipt = await tx.wait();
      
      // Step 4: Extract attestation UID from logs
      const attestationUID = await this.extractAttestationUIDFromReceipt(attestationReceipt);
      
      if (!attestationUID) {
        throw new ApiError(500, 'EAS_FAILURE', 'Failed to extract attestation UID from transaction.');
      }
      
      // Step 5: Save to database
      const attestation = new Attestation({
        attestationUID,
        eventId,
        walletAddress,
        isPremium,
        txHash,
        attestationTxHash: attestationReceipt.hash,
        timestamp: new Date()
      });
      
      await attestation.save();
      
      logger.info('Attestation created successfully', { attestationUID });
      
      return {
        attestationUID,
        txHash,
        eventId,
        walletAddress,
        isPremium,
        timestamp: attestation.timestamp.toISOString(),
        attestationTxHash: attestationReceipt.hash
      };
      
    } catch (error: any) {
      logger.error('Failed to create attestation:', error);
      throw new ApiError(500, 'EAS_FAILURE', `Failed to submit attestation to Base RPC: ${error.message}`);
    }
  }
  
  /**
   * Extract token ID from transaction receipt
   */
  private async extractTokenIdFromReceipt(receipt: ethers.TransactionReceipt): Promise<number | null> {
    // Look for Transfer event (ERC-721)
    // event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
    
    for (const log of receipt.logs) {
      if (log.topics[0] === transferEventSignature) {
        // Token ID is the third topic (indexed parameter)
        const tokenId = ethers.getBigInt(log.topics[3]);
        return Number(tokenId);
      }
    }
    
    return null;
  }
  
  /**
   * Extract attestation UID from transaction receipt
   */
  private async extractAttestationUIDFromReceipt(receipt: ethers.TransactionReceipt): Promise<string | null> {
    // Look for AttestationCreated event
    const attestationEventSignature = ethers.id('AttestationCreated(bytes32,bytes32,address,uint256,bool)');
    
    for (const log of receipt.logs) {
      if (log.topics[0] === attestationEventSignature) {
        // Attestation UID is the first topic after event signature
        return log.topics[1];
      }
    }
    
    return null;
  }
  
  /**
   * Get attestation by UID
   */
  async getAttestation(attestationUID: string) {
    const attestation = await Attestation.findOne({ attestationUID });
    
    if (!attestation) {
      throw new ApiError(404, 'NOT_FOUND', 'Attestation not found.');
    }
    
    return attestation;
  }
  
  /**
   * Get all attestations for a wallet
   */
  async getAttestationsByWallet(walletAddress: string) {
    return await Attestation.find({ walletAddress }).sort({ createdAt: -1 });
  }
  
  /**
   * Get all attestations for an event
   */
  async getAttestationsByEvent(eventId: string) {
    return await Attestation.find({ eventId }).sort({ createdAt: -1 });
  }
}