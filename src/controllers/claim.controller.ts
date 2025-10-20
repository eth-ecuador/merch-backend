import { Request, Response } from 'express';
import { ClaimService } from '../services/claim.service';
import Joi from 'joi';
import { ApiError } from '../utils/errors';

export class ClaimController {
  private claimService: ClaimService;
  
  constructor() {
    this.claimService = new ClaimService();
  }
  
  /**
   * POST /verify-code
   */
  async verifyCode(req: Request, res: Response) {
    // Validate request
    const schema = Joi.object({
      code: Joi.string().required(),
      walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'INVALID_INPUT', error.details[0].message);
    }
    
    const { code, walletAddress } = value;
    
    const result = await this.claimService.verifyCode(code, walletAddress);
    
    res.status(200).json(result);
  }
  
  /**
   * POST /claim-offchain
   */
  async claimOffchain(req: Request, res: Response) {
    // Validate request
    const schema = Joi.object({
      code: Joi.string().required(),
      userIdentifier: Joi.string().required(),
      type: Joi.string().valid('wallet', 'email').required()
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'INVALID_INPUT', error.details[0].message);
    }
    
    const { code, userIdentifier, type } = value;
    
    const result = await this.claimService.claimOffchain(code, userIdentifier, type);
    
    res.status(200).json(result);
  }
}