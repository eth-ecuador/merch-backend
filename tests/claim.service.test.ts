import { ClaimService } from '../services/claim.service';
import { Claim } from '../models/Claim';
import { ApiError } from '../utils/errors';
import { ethers } from 'ethers';

jest.mock('../models/Claim');

describe('ClaimService', () => {
  let claimService: ClaimService;
  
  beforeEach(() => {
    claimService = new ClaimService();
    jest.clearAllMocks();
  });
  
  describe('verifyCode', () => {
    it('should verify a valid claim code', async () => {
      const mockClaim = {
        code: 'TEST-001',
        eventId: '0x1234',
        tokenURI: 'ipfs://test',
        eventName: 'Test Event',
        status: 'available',
        expiresAt: new Date('2025-12-31')
      };
      
      (Claim.findOne as jest.Mock).mockResolvedValue(mockClaim);
      
      const result = await claimService.verifyCode(
        'TEST-001',
        '0x1234567890123456789012345678901234567890'
      );
      
      expect(result.is_valid).toBe(true);
      expect(result.eventId).toBe('0x1234');
    });
    
    it('should reject invalid wallet address', async () => {
      await expect(
        claimService.verifyCode('TEST-001', 'invalid-address')
      ).rejects.toThrow(ApiError);
    });
    
    it('should reject expired claim', async () => {
      const mockClaim = {
        code: 'TEST-001',
        status: 'available',
        expiresAt: new Date('2020-01-01')
      };
      
      (Claim.findOne as jest.Mock).mockResolvedValue(mockClaim);
      
      await expect(
        claimService.verifyCode('TEST-001', '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('expired');
    });
    
    it('should reject already used claim', async () => {
      const mockClaim = {
        code: 'TEST-001',
        status: 'used',
        expiresAt: new Date('2025-12-31')
      };
      
      (Claim.findOne as jest.Mock).mockResolvedValue(mockClaim);
      
      await expect(
        claimService.verifyCode('TEST-001', '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('already been used');
    });
  });
  
  describe('claimOffchain', () => {
    it('should create off-chain reservation with wallet', async () => {
      const mockClaim = {
        code: 'TEST-001',
        eventId: '0x1234',
        eventName: 'Test Event',
        tokenURI: 'ipfs://test',
        status: 'available',
        expiresAt: new Date('2025-12-31'),
        save: jest.fn().mockResolvedValue(true)
      };
      
      (Claim.findOne as jest.Mock).mockResolvedValue(mockClaim);
      
      const result = await claimService.claimOffchain(
        'TEST-001',
        '0x1234567890123456789012345678901234567890',
        'wallet'
      );
      
      expect(result.reservationId).toBeDefined();
      expect(result.type).toBe('wallet');
      expect(mockClaim.save).toHaveBeenCalled();
    });
    
    it('should create off-chain reservation with email', async () => {
      const mockClaim = {
        code: 'TEST-001',
        eventId: '0x1234',
        eventName: 'Test Event',
        tokenURI: 'ipfs://test',
        status: 'available',
        expiresAt: new Date('2025-12-31'),
        save: jest.fn().mockResolvedValue(true)
      };
      
      (Claim.findOne as jest.Mock).mockResolvedValue(mockClaim);
      
      const result = await claimService.claimOffchain(
        'TEST-001',
        'user@example.com',
        'email'
      );
      
      expect(result.reservationId).toBeDefined();
      expect(result.type).toBe('email');
    });
    
    it('should reject invalid email format', async () => {
      await expect(
        claimService.claimOffchain('TEST-001', 'invalid-email', 'email')
      ).rejects.toThrow('Invalid email format');
    });
    
    it('should reject invalid type', async () => {
      await expect(
        claimService.claimOffchain('TEST-001', 'test@example.com', 'invalid' as any)
      ).rejects.toThrow("Type must be 'wallet' or 'email'");
    });
  });
});