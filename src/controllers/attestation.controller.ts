import { Request, Response } from 'express';
import { AttestationService } from '../services/attestation.service';
import Joi from 'joi';
import { ApiError } from '../utils/errors';

export class AttestationController {
  private attestationService: AttestationService;
  
  constructor() {
    this.attestationService = new AttestationService();
  }
  
  /**
   * POST /attest-claim
   */
  async attestClaim(req: Request, res: Response) {
    // Validate request
    const schema = Joi.object({
      txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
      walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      eventId: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
      isPremium: Joi.boolean().required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'INVALID_INPUT', error.details[0].message);
    }
    
    const { txHash, walletAddress, eventId, isPremium } = value;
    
    const result = await this.attestationService.createAttestation(
      txHash,
      walletAddress,
      eventId,
      isPremium
    );
    
    res.status(200).json(result);
  }
  
  /**
   * GET /attestations/:uid
   */
  async getAttestation(req: Request, res: Response) {
    const { uid } = req.params;
    
    if (!uid.startsWith('0x') || uid.length !== 66) {
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid attestation UID format.');
    }
    
    const attestation = await this.attestationService.getAttestation(uid);
    
    res.status(200).json(attestation);
  }
  
  /**
   * GET /attestations/wallet/:address
   */
  async getAttestationsByWallet(req: Request, res: Response) {
    const { address } = req.params;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Invalid wallet address format.');
    }
    
    const attestations = await this.attestationService.getAttestationsByWallet(address);
    
    res.status(200).json({
      walletAddress: address,
      count: attestations.length,
      attestations
    });
  }
}