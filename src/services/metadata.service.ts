import axios from 'axios';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export class MetadataService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private ipfsGateway: string;
  
  // Cache de metadata en memoria (opcional)
  private metadataCache: Map<string, TokenMetadata>;
  
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    this.metadataCache = new Map();
    
    // Warn si no hay credenciales de Pinata (usará mock data)
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      logger.warn('Pinata credentials not configured. Using mock metadata.');
    }
  }
  
  /**
   * Get token metadata by ID
   * Priority: 1) IPFS (via hash), 2) Cache, 3) Generate mock
   */
  async getTokenMetadata(tokenId: string): Promise<TokenMetadata> {
    logger.info('Fetching token metadata', { tokenId });
    
    // Check cache first
    const cacheKey = `token_${tokenId}`;
    if (this.metadataCache.has(cacheKey)) {
      logger.info('Metadata found in cache', { tokenId });
      return this.metadataCache.get(cacheKey)!;
    }
    
    // Try to fetch from IPFS if we have a hash stored
    // (In production, you'd look this up from database)
    const ipfsHash = await this.getIPFSHashForToken(tokenId);
    
    if (ipfsHash) {
      try {
        const metadata = await this.fetchFromIPFS(ipfsHash);
        this.metadataCache.set(cacheKey, metadata);
        return metadata;
      } catch (error) {
        logger.error('Failed to fetch from IPFS, falling back to generated metadata', { error });
      }
    }
    
    // Generate metadata if not found
    const metadata = this.generateMetadata(tokenId);
    this.metadataCache.set(cacheKey, metadata);
    
    return metadata;
  }
  
  /**
   * Fetch metadata from IPFS
   */
  private async fetchFromIPFS(ipfsHash: string): Promise<TokenMetadata> {
    const url = `${this.ipfsGateway}/${ipfsHash}`;
    
    logger.info('Fetching from IPFS', { ipfsHash, url });
    
    try {
      const response = await axios.get(url, {
        timeout: 10000 // 10 second timeout
      });
      
      return response.data as TokenMetadata;
    } catch (error: any) {
      logger.error('IPFS fetch failed', { ipfsHash, error: error.message });
      throw new ApiError(404, 'NOT_FOUND', `Failed to fetch metadata from IPFS: ${error.message}`);
    }
  }
  
  /**
   * Upload metadata to IPFS via Pinata
   * @returns IPFS hash
   */
  async uploadToIPFS(metadata: TokenMetadata): Promise<string> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new ApiError(500, 'IPFS_NOT_CONFIGURED', 'Pinata credentials not configured');
    }
    
    logger.info('Uploading metadata to IPFS', { metadata });
    
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: `token-${Date.now()}.json`,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );
      
      const ipfsHash = response.data.IpfsHash;
      logger.info('Successfully uploaded to IPFS', { ipfsHash });
      
      return ipfsHash;
      
    } catch (error: any) {
      logger.error('Failed to upload to IPFS', { error: error.response?.data || error.message });
      throw new ApiError(500, 'IPFS_UPLOAD_FAILED', 'Failed to upload metadata to IPFS');
    }
  }
  
  /**
   * Upload image to IPFS via Pinata
   * @param imageBuffer - Image file buffer
   * @param fileName - Original filename
   * @returns IPFS hash
   */
  async uploadImageToIPFS(imageBuffer: Buffer, fileName: string): Promise<string> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new ApiError(500, 'IPFS_NOT_CONFIGURED', 'Pinata credentials not configured');
    }
    
    logger.info('Uploading image to IPFS', { fileName });
    
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', imageBuffer, fileName);
    formData.append('pinataMetadata', JSON.stringify({
      name: fileName
    }));
    
    try {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          },
          maxBodyLength: Infinity
        }
      );
      
      const ipfsHash = response.data.IpfsHash;
      logger.info('Successfully uploaded image to IPFS', { ipfsHash });
      
      return ipfsHash;
      
    } catch (error: any) {
      logger.error('Failed to upload image to IPFS', { error: error.response?.data || error.message });
      throw new ApiError(500, 'IPFS_UPLOAD_FAILED', 'Failed to upload image to IPFS');
    }
  }
  
  /**
   * Get IPFS hash for a token (from database or contract)
   * This is a placeholder - implement based on your storage strategy
   */
  private async getIPFSHashForToken(tokenId: string): Promise<string | null> {
    // Option 1: Query from database where you store tokenId -> IPFS hash mapping
    // const claim = await Claim.findOne({ tokenId });
    // return claim?.ipfsHash || null;
    
    // Option 2: Query from smart contract tokenURI
    // const tokenURI = await contract.tokenURI(tokenId);
    // if (tokenURI.startsWith('ipfs://')) {
    //   return tokenURI.replace('ipfs://', '');
    // }
    
    // For now, return null (will use generated metadata)
    return null;
  }
  
  /**
   * Generate metadata for a token (fallback if not in IPFS)
   */
  private generateMetadata(tokenId: string): TokenMetadata {
    return {
      name: `Merch MVP Token #${tokenId}`,
      description: 'Proof of attendance at an amazing event on Base Network',
      image: `ipfs://QmPlaceholderImageHash/${tokenId}`, // Replace with real image hash
      external_url: `https://merch-mvp.xyz/token/${tokenId}`,
      attributes: [
        {
          trait_type: 'Event',
          value: 'Base Bootcamp 2025'
        },
        {
          trait_type: 'Type',
          value: 'SBT'
        },
        {
          trait_type: 'Token ID',
          value: parseInt(tokenId)
        },
        {
          trait_type: 'Minted Date',
          value: new Date().toISOString().split('T')[0]
        },
        {
          trait_type: 'Network',
          value: 'Base Sepolia'
        },
        {
          trait_type: 'Standard',
          value: 'ERC-4973'
        }
      ]
    };
  }
  
  /**
   * Create and upload complete token metadata to IPFS
   * @param tokenId - Token ID
   * @param eventName - Event name
   * @param eventDescription - Event description
   * @param imageHash - IPFS hash of the token image
   * @returns Complete metadata object and IPFS hash
   */
  async createAndUploadMetadata(
    tokenId: string,
    eventName: string,
    eventDescription: string,
    imageHash: string,
    isPremium: boolean = false
  ): Promise<{ metadata: TokenMetadata; ipfsHash: string }> {
    const metadata: TokenMetadata = {
      name: `${eventName} - ${isPremium ? 'Premium' : 'Attendance'} Token #${tokenId}`,
      description: eventDescription,
      image: `ipfs://${imageHash}`,
      external_url: `https://merch-mvp.xyz/token/${tokenId}`,
      attributes: [
        {
          trait_type: 'Event',
          value: eventName
        },
        {
          trait_type: 'Type',
          value: isPremium ? 'Premium NFT' : 'SBT'
        },
        {
          trait_type: 'Token ID',
          value: parseInt(tokenId)
        },
        {
          trait_type: 'Minted Date',
          value: new Date().toISOString().split('T')[0]
        },
        {
          trait_type: 'Network',
          value: 'Base Sepolia'
        },
        {
          trait_type: 'Standard',
          value: isPremium ? 'ERC-721' : 'ERC-4973'
        },
        {
          trait_type: 'Transferable',
          value: isPremium ? 'Yes' : 'No'
        }
      ]
    };
    
    // Upload to IPFS
    const ipfsHash = await this.uploadToIPFS(metadata);
    
    return {
      metadata,
      ipfsHash
    };
  }
  
  /**
   * Batch upload multiple metadata files
   */
  async batchUploadMetadata(
    metadataList: TokenMetadata[]
  ): Promise<string[]> {
    const ipfsHashes: string[] = [];
    
    for (const metadata of metadataList) {
      try {
        const hash = await this.uploadToIPFS(metadata);
        ipfsHashes.push(hash);
      } catch (error) {
        logger.error('Failed to upload metadata in batch', { error });
        ipfsHashes.push(''); // Empty string for failed uploads
      }
    }
    
    return ipfsHashes;
  }
  
  /**
   * Pin existing IPFS hash to your Pinata account
   */
  async pinExistingIPFS(ipfsHash: string): Promise<void> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new ApiError(500, 'IPFS_NOT_CONFIGURED', 'Pinata credentials not configured');
    }
    
    try {
      await axios.post(
        'https://api.pinata.cloud/pinning/pinByHash',
        {
          hashToPin: ipfsHash,
          pinataMetadata: {
            name: `pinned-${ipfsHash}`
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );
      
      logger.info('Successfully pinned IPFS hash', { ipfsHash });
    } catch (error: any) {
      logger.error('Failed to pin IPFS hash', { ipfsHash, error: error.response?.data });
      throw new ApiError(500, 'IPFS_PIN_FAILED', 'Failed to pin IPFS hash');
    }
  }
  
  /**
   * Get Pinata pin list (for debugging/monitoring)
   */
  async getPinnedFiles(): Promise<any> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new ApiError(500, 'IPFS_NOT_CONFIGURED', 'Pinata credentials not configured');
    }
    
    try {
      const response = await axios.get(
        'https://api.pinata.cloud/data/pinList',
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get pin list', { error: error.response?.data });
      throw new ApiError(500, 'IPFS_QUERY_FAILED', 'Failed to query Pinata');
    }
  }
}