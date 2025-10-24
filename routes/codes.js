/**
 * Codes Generation Routes
 * 
 * Endpoint for Chainlink Automation to create codes for events
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============ Helper Functions ============

/**
 * Generate random claim code
 */
function generateClaimCode(eventName, index) {
  // Remove special characters from event name
  const cleanName = eventName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
  
  // Generate random alphanumeric string (6 chars)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format: EVENTNAME-RANDOM-INDEX
  const paddedIndex = String(index).padStart(4, '0');
  return `${cleanName}-${randomStr}-${paddedIndex}`;
}

/**
 * Generate metadata for claim
 */
function generateMetadata(eventName, eventDescription, imageUri, index) {
  return {
    name: `${eventName} - Attendance Proof #${index}`,
    description: `Proof of attendance for ${eventName}. ${eventDescription}`,
    image: imageUri,
    attributes: [
      {
        trait_type: 'Event',
        value: eventName
      },
      {
        trait_type: 'Token Index',
        value: index
      },
      {
        trait_type: 'Claim Type',
        value: 'Soul Bound Token'
      }
    ]
  };
}

// ============ Authentication Middleware ============

/**
 * Require API Key
 * Uses the same API_KEY as admin endpoints for simplicity
 * Chainlink webhook will send this key in X-API-KEY header
 */
function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Valid API key required'
    });
  }
  
  next();
}

// ============ Routes ============

/**
 * POST /api/createCodes
 * 
 * Create claim codes for an event (called by Chainlink)
 * 
 * Body:
 * {
 *   eventId: string (required) - Event ID from blockchain
 *   eventName: string (required) - Event name
 *   eventDescription: string (optional) - Event description
 *   imageUri: string (required) - IPFS image URI
 *   quantity: number (required) - Number of codes to generate
 * }
 */
router.post('/createCodes', requireAuth, async (req, res) => {
  try {
    console.log('\n🎫 ═══════════════════════════════════════');
    console.log('   CREATE CODES REQUEST (Chainlink)');
    console.log('   ═══════════════════════════════════════');
    
    const { eventId, eventName, eventDescription, imageUri, quantity } = req.body;
    
    // Validate request
    if (!eventId) {
      console.log('❌ Missing eventId');
      return res.status(400).json({
        success: false,
        error: 'eventId is required'
      });
    }
    
    if (!eventName) {
      console.log('❌ Missing eventName');
      return res.status(400).json({
        success: false,
        error: 'eventName is required'
      });
    }
    
    if (!imageUri) {
      console.log('❌ Missing imageUri');
      return res.status(400).json({
        success: false,
        error: 'imageUri is required'
      });
    }
    
    if (!quantity || quantity < 1 || quantity > 1000) {
      console.log('❌ Invalid quantity');
      return res.status(400).json({
        success: false,
        error: 'quantity must be between 1 and 1000'
      });
    }
    
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Event Name: ${eventName}`);
    console.log(`   Description: ${eventDescription || 'N/A'}`);
    console.log(`   Image URI: ${imageUri}`);
    console.log(`   Quantity: ${quantity}`);
    
    // Check if codes already exist for this event
    const existingCodes = await db.getClaimsByEventId(eventId);
    if (existingCodes.length > 0) {
      console.log(`⚠️  Codes already exist for this event (${existingCodes.length} codes)`);
      return res.status(409).json({
        success: false,
        error: 'Codes already exist for this event',
        existing_codes: existingCodes.length
      });
    }
    
    console.log(`\n🎫 Generating ${quantity} codes for event: ${eventName}`);
    console.log(`   EventId: ${eventId}`);
    
    // Generate codes
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const claims = [];
    
    for (let i = 0; i < quantity; i++) {
      const code = generateClaimCode(eventName, i);
      const tokenUri = `${baseUrl}/api/token-metadata/${i}`;
      const metadata = generateMetadata(
        eventName,
        eventDescription || '',
        imageUri,
        i
      );
      
      claims.push({
        code,
        event_id: eventId,
        token_uri: tokenUri,
        metadata
      });
    }
    
    // Insert in batches of 50
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < claims.length; i += batchSize) {
      const batch = claims.slice(i, i + batchSize);
      const count = await db.insertClaimsBatch(batch);
      insertedCount += count;
      console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${count} codes inserted`);
    }
    
    console.log(`✅ ${insertedCount} codes generated successfully`);
    console.log(`✅ Event processed successfully`);
    console.log('═══════════════════════════════════════\n');
    
    // Response
    res.status(201).json({
      success: true,
      eventId: eventId,
      eventName: eventName,
      codesGenerated: insertedCount,
      message: 'Codes created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating codes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create codes'
    });
  }
});

/**
 * GET /api/codes/event/:eventId
 * 
 * Get codes for a specific event (public endpoint)
 */
router.get('/codes/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const codes = await db.getClaimsByEventId(eventId);
    
    res.json({
      success: true,
      event_id: eventId,
      total: codes.length,
      used: codes.filter(c => c.used).length,
      available: codes.filter(c => !c.used).length,
      codes: codes
    });
    
  } catch (error) {
    console.error('❌ Error getting codes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/checkCodesExist
 * 
 * Check if codes exist for an event (for Chainlink to check before creating)
 */
router.post('/checkCodesExist', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'eventId is required'
      });
    }
    
    const codes = await db.getClaimsByEventId(eventId);
    
    res.json({
      success: true,
      eventId: eventId,
      exists: codes.length > 0,
      count: codes.length
    });
    
  } catch (error) {
    console.error('❌ Error checking codes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;