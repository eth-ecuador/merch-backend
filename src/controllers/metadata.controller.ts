import { Request, Response } from 'express';
import { MetadataService } from '../services/metadata.service';
import { ApiError } from '../utils/errors';

export class MetadataController {
  private metadataService: MetadataService;
  
  constructor() {
    this.metadataService = new MetadataService();
  }
  
  /**
   * GET /token-metadata/:id
   * Serves ERC-721 compliant metadata for a token
   */
  async getTokenMetadata(req: Request, res: Response) {
    const { id } = req.params;
    
    // Validate token ID is numeric
    if (!/^\d+$/.test(id)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Token ID must be a number.');
    }
    
    const metadata = await this.metadataService.getTokenMetadata(id);
    
    res.status(200).json(metadata);
  }
  
  /**
   * POST /upload-metadata
   * Upload metadata to IPFS (admin only)
   */
  async uploadMetadata(req: Request, res: Response) {
    const { metadata } = req.body;
    
    if (!metadata) {
      throw new ApiError(400, 'INVALID_INPUT', 'Metadata is required.');
    }
    
    const ipfsHash = await this.metadataService.uploadToIPFS(metadata);
    
    res.status(200).json({
      ipfsHash,
      url: `ipfs://${ipfsHash}`,
      gateway: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    });
  }
  
  /**
   * POST /create-metadata
   * Create and upload complete metadata (admin only)
   */
  async createMetadata(req: Request, res: Response) {
    const { tokenId, eventName, eventDescription, imageHash, isPremium } = req.body;
    
    if (!tokenId || !eventName || !eventDescription || !imageHash) {
      throw new ApiError(400, 'INVALID_INPUT', 'Missing required fields.');
    }
    
    const result = await this.metadataService.createAndUploadMetadata(
      tokenId,
      eventName,
      eventDescription,
      imageHash,
      isPremium || false
    );
    
    res.status(200).json({
      metadata: result.metadata,
      ipfsHash: result.ipfsHash,
      url: `ipfs://${result.ipfsHash}`,
      gateway: `https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`
    });
  }
}