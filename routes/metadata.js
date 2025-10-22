// routes/metadata.js
// Token metadata serving and management

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const MetadataService = require('../services/metadata-service');

// Initialize metadata service
const metadataService = new MetadataService(
  process.env.METADATA_STORAGE_TYPE || 'local'
);

// ==============================================
// MIDDLEWARE
// ==============================================

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ==============================================
// ENDPOINTS
// ==============================================

/**
 * @route   GET /api/token-metadata/:id
 * @desc    Get metadata for a specific token (ERC-721 standard)
 * @access  Public (required for NFT platforms)
 */
router.get('/token-metadata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tokenId = parseInt(id);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ 
        error: 'Invalid token ID' 
      });
    }
    
    // Get metadata from database
    const metadata = await db.getTokenMetadata(tokenId);
    
    if (metadata) {
      return res.json(metadata);
    }
    
    // If not in database, generate default metadata
    const defaultMetadata = metadataService.generateSBTMetadata(
      tokenId,
      'Unknown Event',
      '0x0000000000000000000000000000000000000000',
      Math.floor(Date.now() / 1000)
    );
    
    return res.json(defaultMetadata);
    
  } catch (error) {
    console.error('❌ Error serving metadata:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve metadata' 
    });
  }
});

/**
 * @route   POST /api/update-metadata
 * @desc    Update metadata for a token (admin only)
 * @access  Protected (requires API key)
 */
router.post('/update-metadata', requireApiKey, async (req, res) => {
  try {
    const { tokenId, metadata } = req.body;
    
    if (!tokenId || !metadata) {
      return res.status(400).json({ 
        error: 'Missing required fields: tokenId, metadata' 
      });
    }
    
    // Validate metadata structure
    if (!metadata.name || !metadata.description) {
      return res.status(400).json({ 
        error: 'Invalid metadata structure. Required: name, description' 
      });
    }
    
    // Update in database
    await db.updateTokenMetadata(tokenId, metadata);
    
    console.log(`✅ Metadata updated for token #${tokenId}`);
    
    return res.json({
      success: true,
      tokenId,
      metadata
    });
    
  } catch (error) {
    console.error('❌ Error updating metadata:', error);
    return res.status(500).json({ 
      error: 'Failed to update metadata' 
    });
  }
});

/**
 * @route   POST /api/batch-upload-metadata
 * @desc    Batch upload metadata for multiple tokens
 * @access  Protected (requires API key)
 */
router.post('/batch-upload-metadata', requireApiKey, async (req, res) => {
  try {
    const { metadataArray } = req.body;
    
    if (!Array.isArray(metadataArray)) {
      return res.status(400).json({ 
        error: 'metadataArray must be an array' 
      });
    }
    
    const results = [];
    
    for (const item of metadataArray) {
      const { tokenId, metadata } = item;
      
      try {
        await db.updateTokenMetadata(tokenId, metadata);
        results.push({ tokenId, success: true });
      } catch (error) {
        results.push({ tokenId, success: false, error: error.message });
      }
    }
    
    console.log(`✅ Batch upload completed: ${results.filter(r => r.success).length}/${results.length}`);
    
    return res.json({
      success: true,
      total: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
    
  } catch (error) {
    console.error('❌ Error in batch upload:', error);
    return res.status(500).json({ 
      error: 'Batch upload failed' 
    });
  }
});

module.exports = router;