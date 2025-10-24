/**
 * Merch Routes
 * 
 * Endpoints para crear y gestionar merch (productos)
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

/**
 * POST /api/createMerch
 * 
 * Create new merch with image upload to IPFS
 * 
 * Form Data:
 * - image: File (required)
 * - creatorAddress: string (required)
 * - merchName: string (required)
 * - merchDescription: string (optional)
 */
router.post('/createMerch', upload.single('image'), async (req, res) => {
  try {
    console.log('\n🎨 Create Merch Request:');
    
    // Validate request
    if (!req.file) {
      console.log('❌ No image file provided');
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }
    
    const { creatorAddress, merchName, merchDescription } = req.body;
    
    if (!creatorAddress) {
      console.log('❌ No creator address provided');
      return res.status(400).json({
        success: false,
        error: 'Creator address is required'
      });
    }
    
    if (!merchName) {
      console.log('❌ No merch name provided');
      return res.status(400).json({
        success: false,
        error: 'Merch name is required'
      });
    }
    
    // Log request details
    console.log(`  Creator: ${creatorAddress}`);
    console.log(`  Name: ${merchName}`);
    console.log(`  Description: ${merchDescription || 'N/A'}`);
    console.log(`  File: ${req.file.originalname}`);
    console.log(`  Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`  Type: ${req.file.mimetype}`);
    
    // Upload to IPFS via Pinata
    console.log('📤 Uploading to IPFS...');
    
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    const pinataMetadata = JSON.stringify({
      name: `${merchName} - Merch Image`,
      keyvalues: {
        creator: creatorAddress,
        type: 'merch',
        name: merchName
      }
    });
    formData.append('pinataMetadata', pinataMetadata);
    
    const pinataOptions = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', pinataOptions);
    
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: formData
    });
    
    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error('❌ Pinata upload failed:', errorText);
      throw new Error(`Pinata upload failed: ${pinataResponse.statusText}`);
    }
    
    const pinataData = await pinataResponse.json();
    const ipfsHash = pinataData.IpfsHash;
    const imageUri = `ipfs://${ipfsHash}`;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    
    console.log('✅ Uploaded to IPFS:', ipfsHash);
    console.log('  Gateway URL:', gatewayUrl);
    
    // Generate unique merch ID
    const merchId = uuidv4();
    
    // Store in database
    console.log('💾 Storing in database...');
    
    const merchData = {
      merch_id: merchId,
      merch_name: merchName,
      merch_description: merchDescription || '',
      image_uri: imageUri,
      ipfs_hash: ipfsHash,
      gateway_url: gatewayUrl,
      creator_address: creatorAddress.toLowerCase(),
      metadata: {
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    };
    
    const savedMerch = await db.insertMerch(merchData);
    
    console.log('✅ Merch saved to database');
    console.log(`  Merch ID: ${merchId}`);
    console.log('✅ Create Merch successful!\n');
    
    // Response
    res.status(201).json({
      success: true,
      merchId: merchId,
      merchName: merchName,
      merchDescription: merchDescription,
      imageUri: imageUri,
      ipfsHash: ipfsHash,
      gatewayUrl: gatewayUrl,
      creatorAddress: creatorAddress.toLowerCase(),
      createdAt: savedMerch.created_at,
      message: 'Merch created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating merch:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create merch'
    });
  }
});

/**
 * GET /api/merch/:merchId
 * 
 * Get merch by ID
 */
router.get('/merch/:merchId', async (req, res) => {
  try {
    const { merchId } = req.params;
    
    const merch = await db.getMerchById(merchId);
    
    if (!merch) {
      return res.status(404).json({
        success: false,
        error: 'Merch not found'
      });
    }
    
    res.json({
      success: true,
      merch: merch
    });
    
  } catch (error) {
    console.error('❌ Error fetching merch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/merch/creator/:address
 * 
 * Get all merch by creator address
 */
router.get('/merch/creator/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const merchList = await db.getMerchByCreator(address.toLowerCase());
    
    res.json({
      success: true,
      count: merchList.length,
      merch: merchList
    });
    
  } catch (error) {
    console.error('❌ Error fetching creator merch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/merch
 * 
 * Get all merch with pagination
 */
router.get('/merch', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await db.getAllMerch(limit, offset);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Error fetching merch list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;