// routes/claims.js
// Claim verification and signature generation endpoints

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../database/db');

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
// SIGNATURE GENERATION
// ==============================================

/**
 * Generate ECDSA signature for public contract call
 * This is the CRITICAL function that enables gasless backend operation
 */
async function generateSignature(to, eventId, tokenURI) {
  const backendWallet = global.backendWallet;
  
  // Create message hash matching contract's verification
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string'],
    [to, eventId, tokenURI]
  );
  
  // Sign the message hash
  const signature = await backendWallet.signMessage(ethers.getBytes(messageHash));
  
  console.log('📝 Signature generated:');
  console.log('   To:', to);
  console.log('   Event ID:', eventId);
  console.log('   Token URI:', tokenURI);
  console.log('   Message Hash:', messageHash);
  console.log('   Signature:', signature);
  
  return signature;
}

// ==============================================
// PUBLIC ENDPOINTS
// ==============================================

/**
 * @route   POST /api/verify-code
 * @desc    Verifies claim code and generates signature for public contract call
 * @access  Protected (requires API key)
 * @spec    As per Merch MVP specification
 */
router.post('/verify-code', requireApiKey, async (req, res) => {
  try {
    const { code, walletAddress } = req.body;
    
    // Validate input
    if (!code || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: code, walletAddress' 
      });
    }
    
    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format' 
      });
    }
    
    // Get claim from database
    const claim = await db.getClaim(code);
    
    if (!claim) {
      return res.status(404).json({ 
        error: 'Claim code not found',
        is_valid: false
      });
    }
    
    // Check if already used
    if (claim.used) {
      return res.status(400).json({ 
        error: 'Claim code already used',
        is_valid: false,
        usedBy: claim.usedBy,
        usedAt: claim.usedAt
      });
    }
    
    // Check if reserved by someone else
    if (claim.reservedBy && claim.reservedBy !== walletAddress) {
      return res.status(400).json({
        error: 'Claim code reserved by another user',
        is_valid: false
      });
    }
    
    // 🆕 If using IPFS, upload metadata first
    let tokenURI = claim.tokenURI;
    
    if (process.env.METADATA_STORAGE_TYPE === 'ipfs' && claim.metadata) {
      console.log('📤 Uploading metadata to Pinata...');
      
      try {
        const MetadataService = require('../services/metadata-service');
        const metadataService = new MetadataService('ipfs');
        
        // Upload to IPFS
        tokenURI = await metadataService.uploadToIPFS(claim.metadata);
        
        console.log(`✅ Metadata uploaded: ${tokenURI}`);
        
        // Update claim with IPFS URI
        await db.updateClaimTokenURI(code, tokenURI);
        
      } catch (uploadError) {
        console.error('⚠️  IPFS upload failed, using original URI:', uploadError.message);
        // Continue with original tokenURI if upload fails
      }
    }
    
    // ✅ CRITICAL: Generate signature for public contract call
    const signature = await generateSignature(
      walletAddress,
      claim.eventId,
      tokenURI
    );
    
    // Mark as used
    await db.markClaimAsUsed(code, walletAddress);
    
    // Log for analytics
    console.log(`✅ Signature generated for ${walletAddress}`);
    console.log(`   Code: ${code}`);
    console.log(`   Event: ${claim.eventId}`);
    console.log(`   Token URI: ${tokenURI}`);
    
    // Return response per spec
    return res.json({
      eventId: claim.eventId,
      tokenURI: tokenURI,
      signature: signature,
      is_valid: true
    });
    
  } catch (error) {
    console.error('❌ Error in /verify-code:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      is_valid: false
    });
  }
});

/**
 * @route   POST /api/claim-offchain
 * @desc    Reserve a claim for users without wallets (email/phone)
 * @access  Protected (requires API key)
 */
router.post('/claim-offchain', requireApiKey, async (req, res) => {
  try {
    const { code, userIdentifier, type } = req.body;
    
    // Validate input
    if (!code || !userIdentifier || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: code, userIdentifier, type' 
      });
    }
    
    // Validate type
    if (!['email', 'phone', 'twitter', 'telegram'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be: email, phone, twitter, or telegram' 
      });
    }
    
    // Get claim from database
    const claim = await db.getClaim(code);
    
    if (!claim) {
      return res.status(404).json({ 
        error: 'Claim code not found' 
      });
    }
    
    // Check if already used
    if (claim.used) {
      return res.status(400).json({ 
        error: 'Claim code already used' 
      });
    }
    
    // Check if already reserved
    if (claim.reservedBy) {
      return res.status(400).json({ 
        error: 'Claim code already reserved' 
      });
    }
    
    // Create reservation
    const reservationId = ethers.hexlify(ethers.randomBytes(32));
    
    await db.createReservation({
      reservationId,
      code,
      userIdentifier,
      type,
      eventId: claim.eventId,
      tokenURI: claim.tokenURI
    });
    
    // Mark claim as reserved
    await db.reserveClaim(code, userIdentifier);
    
    console.log(`✅ Off-chain claim reserved:`);
    console.log(`   Code: ${code}`);
    console.log(`   User: ${userIdentifier} (${type})`);
    console.log(`   Reservation ID: ${reservationId}`);
    
    return res.json({
      reservationId,
      message: 'Claim reserved. Redeem on-chain when you create a wallet.',
      eventId: claim.eventId,
      tokenURI: claim.tokenURI
    });
    
  } catch (error) {
    console.error('❌ Error in /claim-offchain:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * @route   POST /api/redeem-reservation
 * @desc    Redeem an off-chain reservation with a wallet address
 * @access  Protected (requires API key)
 */
router.post('/redeem-reservation', requireApiKey, async (req, res) => {
  try {
    const { reservationId, walletAddress } = req.body;
    
    // Validate input
    if (!reservationId || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: reservationId, walletAddress' 
      });
    }
    
    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format' 
      });
    }
    
    // Get reservation
    const reservation = await db.getReservation(reservationId);
    
    if (!reservation) {
      return res.status(404).json({ 
        error: 'Reservation not found' 
      });
    }
    
    // Get claim
    const claim = await db.getClaim(reservation.code);
    
    if (!claim) {
      return res.status(404).json({ 
        error: 'Claim not found' 
      });
    }
    
    // Check if already redeemed
    if (claim.used) {
      return res.status(400).json({ 
        error: 'Claim already redeemed' 
      });
    }
    
    // Generate signature
    const signature = await generateSignature(
      walletAddress,
      claim.eventId,
      claim.tokenURI
    );
    
    // Mark as used
    await db.markClaimAsUsed(reservation.code, walletAddress);
    
    console.log(`✅ Reservation redeemed:`);
    console.log(`   Reservation ID: ${reservationId}`);
    console.log(`   Wallet: ${walletAddress}`);
    
    return res.json({
      eventId: claim.eventId,
      tokenURI: claim.tokenURI,
      signature: signature,
      message: 'Reservation redeemed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error in /redeem-reservation:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ==============================================
// ADMIN ENDPOINTS
// ==============================================

/**
 * @route   POST /api/admin/add-claim
 * @desc    Add a new claim code (admin only)
 * @access  Protected (requires API key)
 */
router.post('/admin/add-claim', requireApiKey, async (req, res) => {
  try {
    const { code, eventId, tokenURI, eventName } = req.body;
    
    if (!code || !eventId || !tokenURI) {
      return res.status(400).json({ 
        error: 'Missing required fields: code, eventId, tokenURI' 
      });
    }
    
    const MetadataService = require('../services/metadata-service');
    const metadataService = new MetadataService(process.env.METADATA_STORAGE_TYPE || 'local');
    
    // Generate metadata
    const metadata = metadataService.generateSBTMetadata(
      1,
      eventName || 'Unknown Event',
      '0x0000000000000000000000000000000000000000',
      Math.floor(Date.now() / 1000)
    );
    
    await db.createClaim({
      code,
      eventId,
      tokenURI,
      metadata
    });
    
    console.log(`✅ Claim added: ${code} → ${eventName || eventId}`);
    
    return res.json({
      success: true,
      code,
      eventId,
      eventName
    });
    
  } catch (error) {
    console.error('❌ Error adding claim:', error);
    return res.status(500).json({ 
      error: 'Failed to add claim',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/admin/add-sample-claims
 * @desc    Add multiple sample claims at once
 * @access  Protected (requires API key)
 */
router.post('/admin/add-sample-claims', requireApiKey, async (req, res) => {
  try {
    const SAMPLE_EVENTS = [
      { name: 'Web3 Summit 2025', eventId: ethers.hexlify(ethers.randomBytes(32)) },
      { name: 'NFT NYC 2025', eventId: ethers.hexlify(ethers.randomBytes(32)) },
      { name: 'ETH Denver 2025', eventId: ethers.hexlify(ethers.randomBytes(32)) }
    ];
    
    const SAMPLE_CODES = [
      'TEST123', 'DEMO456', 'SAMPLE789', 'DEVTEST001', 'ALPHA001',
      'BETA002', 'GAMMA003', 'DELTA004', 'EPSILON005', 'ZETA006'
    ];
    
    const added = [];
    
    for (let i = 0; i < SAMPLE_CODES.length; i++) {
      const code = SAMPLE_CODES[i];
      const event = SAMPLE_EVENTS[i % SAMPLE_EVENTS.length];
      const tokenURI = `${process.env.BASE_URL || 'http://localhost:3000'}/api/token-metadata/${i + 1}`;
      
      const MetadataService = require('../services/metadata-service');
      const metadataService = new MetadataService(process.env.METADATA_STORAGE_TYPE || 'local');
      
      const metadata = metadataService.generateSBTMetadata(
        i + 1,
        event.name,
        '0x0000000000000000000000000000000000000000',
        Math.floor(Date.now() / 1000)
      );
      
      await db.createClaim({
        code,
        eventId: event.eventId,
        tokenURI,
        metadata
      });
      
      added.push({ code, event: event.name });
      console.log(`✅ Added: ${code} → ${event.name}`);
    }
    
    return res.json({
      success: true,
      count: added.length,
      claims: added
    });
    
  } catch (error) {
    console.error('❌ Error adding sample claims:', error);
    return res.status(500).json({ 
      error: 'Failed to add sample claims',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/admin/generate-bulk-claims
 * @desc    Generate multiple claim codes at once (bulk generation)
 * @access  Protected (requires API key)
 */
router.post('/admin/generate-bulk-claims', requireApiKey, async (req, res) => {
  try {
    const { count, prefix, eventName } = req.body;
    
    // Validate input
    if (!count || count < 1 || count > 1000) {
      return res.status(400).json({ 
        error: 'Count must be between 1 and 1000' 
      });
    }
    
    // Event templates
    const EVENTS = [
      { name: 'Web3 Summit 2025', location: 'Lisbon' },
      { name: 'NFT NYC 2025', location: 'New York' },
      { name: 'ETH Denver 2025', location: 'Denver' },
      { name: 'Token2049 Singapore', location: 'Singapore' },
      { name: 'Consensus Austin', location: 'Austin' },
      { name: 'EthCC Paris', location: 'Paris' },
      { name: 'DevCon Bangkok', location: 'Bangkok' },
      { name: 'Base Camp Miami', location: 'Miami' },
      { name: 'Blockchain Week NYC', location: 'New York' },
      { name: 'Web3 Conference Dubai', location: 'Dubai' }
    ];
    
    const created = [];
    const failed = [];
    
    console.log(`📦 Generating ${count} bulk claims...`);
    
    for (let i = 0; i < count; i++) {
      try {
        // Generate unique code
        const codePrefix = prefix || 'BULK';
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const numberPart = String(i).padStart(4, '0');
        const code = `${codePrefix}-${randomPart}-${numberPart}`;
        
        // Select event (cycle through events or use provided eventName)
        const event = eventName 
          ? { name: eventName, location: '' }
          : EVENTS[i % EVENTS.length];
        
        // Generate event ID
        const eventId = ethers.hexlify(ethers.randomBytes(32));
        
        // Generate token URI
        const tokenURI = `${process.env.BASE_URL || 'http://localhost:3000'}/api/token-metadata/${Date.now()}-${i}`;
        
        // Generate metadata
        const MetadataService = require('../services/metadata-service');
        const metadataService = new MetadataService(process.env.METADATA_STORAGE_TYPE || 'local');
        
        const metadata = metadataService.generateSBTMetadata(
          Date.now() + i,
          event.location ? `${event.name} - ${event.location}` : event.name,
          '0x0000000000000000000000000000000000000000',
          Math.floor(Date.now() / 1000)
        );
        
        // Create claim in database
        await db.createClaim({
          code,
          eventId,
          tokenURI,
          metadata
        });
        
        created.push({ code, event: event.name });
        
        // Progress log every 50 codes
        if ((i + 1) % 50 === 0) {
          console.log(`   ✅ Generated ${i + 1}/${count} codes...`);
        }
        
      } catch (error) {
        // Skip duplicates silently, log other errors
        if (error.code !== '23505') {
          console.error(`   ❌ Error on code ${i + 1}:`, error.message);
          failed.push({ index: i, error: error.message });
        } else {
          failed.push({ index: i, error: 'Duplicate code (skipped)' });
        }
      }
    }
    
    console.log(`✅ Bulk generation complete: ${created.length} created, ${failed.length} failed`);
    
    return res.json({
      success: true,
      requested: count,
      created: created.length,
      failed: failed.length,
      codes: created.slice(0, 10), // Return first 10 as sample
      sample_codes: created.length > 10 ? created.slice(0, 10) : created,
      errors: failed.slice(0, 5) // Return first 5 errors as sample
    });
    
  } catch (error) {
    console.error('❌ Error generating bulk claims:', error);
    return res.status(500).json({ 
      error: 'Failed to generate bulk claims',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/list-claims
 * @desc    List all claims (admin only)
 * @access  Protected (requires API key)
 */
router.get('/admin/list-claims', requireApiKey, async (req, res) => {
  try {
    const claims = await db.getAllClaims();
    
    // Get statistics
    const stats = {
      total: claims.length,
      used: claims.filter(c => c.used).length,
      available: claims.filter(c => !c.used).length,
      reserved: claims.filter(c => c.reservedBy).length
    };
    
    return res.json({
      success: true,
      count: claims.length,
      stats: stats,
      claims: claims.map(claim => ({
        code: claim.code,
        eventId: claim.eventId,
        used: claim.used,
        usedBy: claim.usedBy,
        usedAt: claim.usedAt,
        reservedBy: claim.reservedBy,
        createdAt: claim.createdAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Error listing claims:', error);
    return res.status(500).json({ 
      error: 'Failed to list claims' 
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get claim statistics (admin only)
 * @access  Protected (requires API key)
 */
router.get('/admin/stats', requireApiKey, async (req, res) => {
  try {
    const claims = await db.getAllClaims();
    
    const stats = {
      total: claims.length,
      used: claims.filter(c => c.used).length,
      available: claims.filter(c => !c.used).length,
      reserved: claims.filter(c => c.reservedBy && !c.used).length,
      percentage_used: ((claims.filter(c => c.used).length / claims.length) * 100).toFixed(2)
    };
    
    return res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return res.status(500).json({ 
      error: 'Failed to get stats' 
    });
  }
});

module.exports = router;