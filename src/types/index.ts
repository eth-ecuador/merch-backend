// src/types/index.ts

export interface VerifyCodeRequest {
  code: string;
  walletAddress: string;
}

export interface VerifyCodeResponse {
  eventId: string;
  tokenURI: string;
  is_valid: boolean;
}

export interface ClaimOffchainRequest {
  code: string;
  userIdentifier: string;
  type: 'wallet' | 'email';
}

export interface ClaimOffchainResponse {
  reservationId: string;
  message: string;
}

export interface AttestClaimRequest {
  txHash: string;
  walletAddress: string;
  eventId: string;
  isPremium: boolean;
}

export interface AttestClaimResponse {
  attestationUID: string;
}

export interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export interface ClaimCode {
  id: string;
  code: string;
  eventId: string;
  eventName: string;
  tokenURI: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface Reservation {
  id: string;
  claimCodeId: string;
  userIdentifier: string;
  type: 'wallet' | 'email';
  status: 'pending' | 'completed' | 'expired';
  createdAt: Date;
  completedAt?: Date;
}

export interface Attestation {
  id: string;
  uid: string;
  eventId: string;
  walletAddress: string;
  tokenId: number;
  isPremium: boolean;
  txHash: string;
  createdAt: Date;
}

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  CLAIM_INVALID = 'CLAIM_INVALID',
  CLAIM_USED = 'CLAIM_USED',
  CLAIM_EXPIRED = 'CLAIM_EXPIRED',
  TX_NOT_FOUND = 'TX_NOT_FOUND',
  TX_FAILED = 'TX_FAILED',
  EAS_FAILURE = 'EAS_FAILURE',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_CODE_FORMAT = 'INVALID_CODE_FORMAT',
  SERVER_ERROR = 'SERVER_ERROR'
}