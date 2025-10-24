/**
 * Claims Routes - Updated for new db.js functions
 * 
 * Endpoints:
 * - POST /api/verify-code (público - verificar código y obtener signature)
 * - GET /api/admin/stats (admin - estadísticas)
 * - GET /api/admin/list-claims (admin - listar códigos)
 */

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../database/db');

// ============ Middleware ============

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }
  
  next();
}

// ============ Helper Functions ============

/**
 * Generate signature for minting
 */
async function generateSignature(walletAddress, eventId, tokenURI) {
  const privateKey = process.env.BACKEND_ISSUER_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('BACKEND_ISSUER_PRIVATE_KEY not configured');
  }
  
  const wallet = new ethers.Wallet(privateKey);
  
  // Create message hash (same as contract verification)
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'string'],
    [walletAddress, eventId, tokenURI]
  );
  
  // Sign the message hash
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  return signature;
}

// ============ Public Routes ============

/**
 * POST /api/verify-code
 * Verify claim code and return signature for minting
 * 
 * Body:
 * - code: string (required)
 * - walletAddress: string (required)
 * 
 * Response:
 * {
 *   "is_valid": true,
 *   "eventId": "0xf0a61a...",
 *   "tokenURI": "http://localhost:3000/api/token-metadata/0",
 *   "signature": "0x...",
 *   "eventMetadata": { ... }
 * }
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { code, walletAddress } = req.body;
    
    // Validate input
    if (!code || !walletAddress) {
      return res.status(400).json({
        is_valid: false,
        error: 'Code and walletAddress are required'
      });
    }
    
    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        is_valid: false,
        error: 'Invalid wallet address format'
      });
    }
    
    console.log('\n🔍 Verifying claim code:', code);
    console.log('   For wallet:', walletAddress);
    
    // Get claim from database
    const claim = await db.getClaim(code);
    
    if (!claim) {
      console.log('   ❌ Code not found');
      return res.status(404).json({
        is_valid: false,
        error: 'Invalid claim code'
      });
    }
    
    // Check if already used
    if (claim.used) {
      console.log('   ❌ Code already used by:', claim.used_by);
      return res.status(400).json({
        is_valid: false,
        error: 'Claim code already used',
        used_by: claim.used_by,
        used_at: claim.used_at
      });
    }
    
    console.log('   ✅ Valid claim found');
    console.log('   Event ID:', claim.event_id);
    
    // Mark as used
    await db.markClaimAsUsed(code, walletAddress);
    console.log('   ✅ Marked as used');
    
    // Generate signature
    const signature = await generateSignature(
      walletAddress,
      claim.event_id,
      claim.token_uri
    );
    
    console.log('   ✅ Signature generated');
    console.log('');
    
    res.json({
      is_valid: true,
      eventId: claim.event_id,
      tokenURI: claim.token_uri,
      signature,
      eventMetadata: claim.metadata || {}
    });
    
  } catch (error) {
    console.error('❌ Error verifying code:', error);
    res.status(500).json({
      is_valid: false,
      error: 'Failed to verify claim code',
      message: error.message
    });
  }
});

// ============ Admin Routes ============

/**
 * GET /api/admin/stats
 * Get overall statistics
 * Requires X-API-KEY header
 */
router.get('/admin/stats', requireApiKey, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/list-claims
 * List all claims with pagination and filters
 * Requires X-API-KEY header
 * 
 * Query params:
 * - limit: number (default: 10, max: 100)
 * - offset: number (default: 0)
 * - event_id: string (filter by event)
 * - used: boolean (filter by usage status)
 * - used_by: string (filter by wallet address)
 */
router.get('/admin/list-claims', requireApiKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    const filters = {};
    if (req.query.event_id) filters.event_id = req.query.event_id;
    if (req.query.used !== undefined) filters.used = req.query.used === 'true';
    if (req.query.used_by) filters.used_by = req.query.used_by;
    
    const result = await db.getClaimsPaginated(limit, offset, filters);
    
    res.json({
      success: true,
      count: result.claims.length,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Error listing claims:', error);
    res.status(500).json({ 
      error: 'Failed to list claims',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/events-summary
 * Get summary of all events with code statistics
 * Requires X-API-KEY header
 */
router.get('/admin/events-summary', requireApiKey, async (req, res) => {
  try {
    const summary = await db.getEventsSummary();
    res.json({
      success: true,
      events: summary,
      total_events: summary.length
    });
  } catch (error) {
    console.error('❌ Error getting events summary:', error);
    res.status(500).json({ 
      error: 'Failed to get events summary',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/event/:eventId/codes
 * Get all codes for a specific event
 * Requires X-API-KEY header
 */
router.get('/admin/event/:eventId/codes', requireApiKey, async (req, res) => {
  try {
    const { eventId } = req.params;
    const codes = await db.getClaimsByEventId(eventId);
    
    res.json({
      success: true,
      event_id: eventId,
      total: codes.length,
      used: codes.filter(c => c.used).length,
      available: codes.filter(c => !c.used).length,
      codes
    });
    
  } catch (error) {
    console.error('❌ Error getting event codes:', error);
    res.status(500).json({ 
      error: 'Failed to get event codes',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/event/:eventId/codes
 * Delete all codes for a specific event
 * Requires X-API-KEY header
 * DANGER: Use with caution
 */
router.delete('/admin/event/:eventId/codes', requireApiKey, async (req, res) => {
  try {
    const { eventId } = req.params;
    const count = await db.deleteClaimsByEventId(eventId);
    
    console.log(`⚠️  Admin deleted ${count} codes for event ${eventId}`);
    
    res.json({
      success: true,
      deleted: count,
      event_id: eventId
    });
    
  } catch (error) {
    console.error('❌ Error deleting event codes:', error);
    res.status(500).json({ 
      error: 'Failed to delete codes',
      message: error.message 
    });
  }
});

module.exports = router;