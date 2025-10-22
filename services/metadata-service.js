// services/metadata-service.js
// Metadata Hosting Service
// Handles uploading and serving NFT metadata via IPFS or Arweave

const { ethers } = require('ethers');

class MetadataService {
  constructor(storageType = 'local') {
    this.storageType = storageType; // 'local', 'ipfs', or 'arweave'
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
  }
  
  /**
   * Generate metadata for an SBT token
   */
  generateSBTMetadata(tokenId, eventName, attendeeAddress, timestamp) {
    return {
      name: `${eventName} - Attendance Proof #${tokenId}`,
      description: `Soul-bound token proving attendance at ${eventName}. This NFT represents verified participation and cannot be transferred.`,
      image: this.generateImageURI(tokenId, 'sbt', eventName),
      external_url: `${this.baseURL}/token/${tokenId}`,
      
      attributes: [
        {
          trait_type: 'Type',
          value: 'Soul Bound Token'
        },
        {
          trait_type: 'Event',
          value: eventName
        },
        {
          trait_type: 'Attendee',
          value: this.formatAddress(attendeeAddress)
        },
        {
          trait_type: 'Network',
          value: 'Base Sepolia'
        },
        {
          display_type: 'date',
          trait_type: 'Claimed At',
          value: timestamp || Math.floor(Date.now() / 1000)
        },
        {
          trait_type: 'Transferable',
          value: 'No'
        }
      ],
      
      properties: {
        category: 'attendance_proof',
        transferable: false,
        chain: 'base-sepolia',
        contract_address: process.env.BASIC_MERCH_ADDRESS,
        token_standard: 'ERC-4973'
      }
    };
  }
  
  /**
   * Generate metadata for a Premium NFT
   */
  generatePremiumMetadata(tokenId, eventName, attendeeAddress, sbtTokenId, timestamp) {
    return {
      name: `${eventName} - Premium Collectible #${tokenId}`,
      description: `Premium tradable collectible from ${eventName}. This NFT represents exclusive participation and can be traded on secondary markets.`,
      image: this.generateImageURI(tokenId, 'premium', eventName),
      external_url: `${this.baseURL}/token/${tokenId}`,
      
      attributes: [
        {
          trait_type: 'Type',
          value: 'Premium NFT'
        },
        {
          trait_type: 'Event',
          value: eventName
        },
        {
          trait_type: 'Original Owner',
          value: this.formatAddress(attendeeAddress)
        },
        {
          trait_type: 'Network',
          value: 'Base Sepolia'
        },
        {
          display_type: 'number',
          trait_type: 'SBT Token ID',
          value: sbtTokenId
        },
        {
          display_type: 'date',
          trait_type: 'Minted At',
          value: timestamp || Math.floor(Date.now() / 1000)
        },
        {
          trait_type: 'Transferable',
          value: 'Yes'
        },
        {
          trait_type: 'Rarity',
          value: this.calculateRarity(tokenId)
        }
      ],
      
      properties: {
        category: 'premium_collectible',
        transferable: true,
        chain: 'base-sepolia',
        contract_address: process.env.PREMIUM_MERCH_ADDRESS,
        token_standard: 'ERC-721',
        companion_sbt: sbtTokenId
      }
    };
  }
  
  /**
   * Generate image URI based on storage type
   */
  generateImageURI(tokenId, type, eventName) {
    const imageHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${eventName}-${type}-${tokenId}`)
    ).slice(2, 48); // Take first 46 chars (IPFS CID length)
    
    switch (this.storageType) {
      case 'ipfs':
        // Use IPFS gateway
        return `ipfs://Qm${imageHash}`;
      
      case 'arweave':
        // Use Arweave transaction ID format
        return `ar://${imageHash}`;
      
      case 'local':
      default:
        // Use local API endpoint
        return `${this.baseURL}/api/images/${type}/${tokenId}`;
    }
  }
  
  /**
   * Format wallet address for display
   */
  formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  /**
   * Calculate rarity tier based on token ID
   */
  calculateRarity(tokenId) {
    const mod = tokenId % 100;
    if (mod < 1) return 'Legendary';
    if (mod < 5) return 'Epic';
    if (mod < 20) return 'Rare';
    return 'Common';
  }
  
  /**
   * Upload metadata to IPFS via Pinata
   * FIXED: Proper JSON formatting for Pinata API
   */
  async uploadToIPFS(metadata) {
    const axios = require('axios');
    
    console.log('📤 Uploading to Pinata...');
    
    // Check credentials
    const jwt = process.env.PINATA_JWT;
    
    if (!jwt) {
      throw new Error('Pinata JWT not configured in .env');
    }
    
    try {
      // Prepare request body in correct format for Pinata
      const body = {
        pinataContent: metadata,
        pinataMetadata: {
          name: metadata.name || 'NFT Metadata',
          keyvalues: {
            type: metadata.properties?.category || 'nft',
            chain: 'base-sepolia'
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };
      
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          }
        }
      );
      
      const ipfsHash = response.data.IpfsHash;
      console.log(`✅ Uploaded to IPFS: ipfs://${ipfsHash}`);
      
      return `ipfs://${ipfsHash}`;
      
    } catch (error) {
      console.error('❌ Pinata upload failed:', error.response?.data || error.message);
      throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
  }
  
  /**
   * Upload metadata to Arweave (requires arweave-js)
   */
  async uploadToArweave(metadata) {
    // This requires Arweave wallet and funding
    
    if (!process.env.ARWEAVE_WALLET_KEY) {
      throw new Error('ARWEAVE_WALLET_KEY not configured');
    }
    
    // Example implementation with Arweave
    const Arweave = require('arweave');
    
    const arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    });
    
    const wallet = JSON.parse(process.env.ARWEAVE_WALLET_KEY);
    
    const transaction = await arweave.createTransaction({
      data: JSON.stringify(metadata)
    }, wallet);
    
    transaction.addTag('Content-Type', 'application/json');
    transaction.addTag('App-Name', 'Merch-MVP');
    
    await arweave.transactions.sign(transaction, wallet);
    await arweave.transactions.post(transaction);
    
    return `ar://${transaction.id}`;
  }
  
  /**
   * Get metadata URL based on storage type
   */
  getMetadataURL(tokenId, cid) {
    switch (this.storageType) {
      case 'ipfs':
        return `ipfs://${cid}`;
      
      case 'arweave':
        return `ar://${cid}`;
      
      case 'local':
      default:
        return `${this.baseURL}/api/token-metadata/${tokenId}`;
    }
  }
}

module.exports = MetadataService;