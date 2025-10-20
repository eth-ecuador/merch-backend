import { Claim } from '../models/Claim';
import { ApiError } from '../utils/errors';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export class ClaimService {
  /**
   * Verify a claim code for on-chain minting
   */
  async verifyCode(code: string, walletAddress: string) {
    logger.info('Verifying claim code', { code, walletAddress });
    
    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid wallet address format.');
    }
    
    // Find claim
    const claim = await Claim.findOne({ code });
    
    if (!claim) {
      throw new ApiError(400, 'CLAIM_INVALID', 'The provided code does not exist.');
    }
    
    // Check expiration
    if (claim.expiresAt < new Date()) {
      throw new ApiError(400, 'CLAIM_INVALID', 'The provided code is expired.');
    }
    
    // Check if already used
    if (claim.status === 'used') {
      throw new ApiError(400, 'CLAIM_INVALID', 'This code has already been used.');
    }
    
    // Check if reserved by someone else
    if (claim.status === 'reserved' && claim.reservedBy !== walletAddress) {
      throw new ApiError(400, 'CLAIM_INVALID', 'This code is reserved by another user.');
    }
    
    return {
      is_valid: true,
      eventId: claim.eventId,
      tokenURI: claim.tokenURI,
      eventName: claim.eventName,
      expiresAt: claim.expiresAt.toISOString()
    };
  }
  
  /**
   * Reserve a claim off-chain
   */
  async claimOffchain(
    code: string,
    userIdentifier: string,
    type: 'wallet' | 'email'
  ) {
    logger.info('Creating off-chain reservation', { code, userIdentifier, type });
    
    // Validate type
    if (type !== 'wallet' && type !== 'email') {
      throw new ApiError(400, 'INVALID_INPUT', "Type must be 'wallet' or 'email'.");
    }
    
    // Validate wallet address if type is wallet
    if (type === 'wallet' && !ethers.isAddress(userIdentifier)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid wallet address format.');
    }
    
    // Validate email if type is email
    if (type === 'email' && !this.isValidEmail(userIdentifier)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid email format.');
    }
    
    // Find claim
    const claim = await Claim.findOne({ code });
    
    if (!claim) {
      throw new ApiError(400, 'CLAIM_INVALID', 'The provided code does not exist.');
    }
    
    // Check expiration
    if (claim.expiresAt < new Date()) {
      throw new ApiError(400, 'CLAIM_INVALID', 'The provided code is expired.');
    }
    
    // Check if already reserved or used
    if (claim.status !== 'available') {
      throw new ApiError(400, 'CLAIM_INVALID', 'This code has already been reserved or used.');
    }
    
    // Generate reservation ID
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Update claim
    claim.status = 'reserved';
    claim.reservedBy = userIdentifier;
    claim.reservationType = type;
    claim.reservationId = reservationId;
    claim.reservedAt = new Date();
    
    await claim.save();
    
    return {
      reservationId,
      message: 'Claim reserved successfully. You can mint on-chain anytime.',
      code: claim.code,
      eventId: claim.eventId,
      eventName: claim.eventName,
      userIdentifier,
      type,
      reservedAt: claim.reservedAt!.toISOString(),
      expiresAt: claim.expiresAt.toISOString()
    };
  }
  
  /**
   * Mark a claim as used after on-chain transaction
   */
  async markClaimAsUsed(code: string, walletAddress: string, txHash: string) {
    const claim = await Claim.findOne({ code });
    
    if (!claim) {
      throw new ApiError(400, 'CLAIM_INVALID', 'Claim not found.');
    }
    
    claim.status = 'used';
    claim.usedBy = walletAddress;
    claim.usedAt = new Date();
    claim.txHash = txHash;
    
    await claim.save();
    
    logger.info('Claim marked as used', { code, walletAddress, txHash });
  }
  
  /**
   * Helper: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Create initial claims for an event
   */
  async createClaimsForEvent(
    eventId: string,
    eventName: string,
    count: number,
    tokenURIBase: string,
    expiresAt: Date
  ) {
    const claims = [];
    
    for (let i = 0; i < count; i++) {
      const code = this.generateClaimCode(eventName, i);
      const tokenURI = `${tokenURIBase}/${i}`;
      
      claims.push({
        code,
        eventId,
        eventName,
        tokenURI,
        status: 'available',
        expiresAt
      });
    }
    
    await Claim.insertMany(claims);
    
    logger.info(`Created ${count} claims for event`, { eventId, eventName });
    
    return claims;
  }
  
  /**
   * Generate a unique claim code
   */
  private generateClaimCode(eventName: string, index: number): string {
    const cleanName = eventName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${cleanName}-${index}-${randomPart}`;
  }
}