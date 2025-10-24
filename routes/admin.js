/**
 * Admin Routes
 * 
 * Protected endpoints for admin operations
 * Requires X-API-KEY header
 */

const express = require('express');
const router = express.Router();
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

// Apply to all admin routes
router.use(requireApiKey);

// ============ Routes ============

/**
 * GET /api/admin/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/admin/list-claims
 * List all claims with pagination and filters
 * 
 * Query params:
 * - limit: number (default: 10, max: 100)
 * - offset: number (default: 0)
 * - event_id: string (filter by event)
 * - used: boolean (filter by usage status)
 * - used_by: string (filter by wallet address)
 */
router.get('/list-claims', async (req, res) => {
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
      ...result
    });
    
  } catch (error) {
    console.error('Error listing claims:', error);
    res.status(500).json({ error: 'Failed to list claims' });
  }
});

/**
 * GET /api/admin/events-summary
 * Get summary of all events with code statistics
 */
router.get('/events-summary', async (req, res) => {
  try {
    const summary = await db.getEventsSummary();
    res.json({
      success: true,
      events: summary,
      total_events: summary.length
    });
  } catch (error) {
    console.error('Error getting events summary:', error);
    res.status(500).json({ error: 'Failed to get events summary' });
  }
});

/**
 * GET /api/admin/event/:eventId/codes
 * Get all codes for a specific event
 */
router.get('/event/:eventId/codes', async (req, res) => {
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
    console.error('Error getting event codes:', error);
    res.status(500).json({ error: 'Failed to get event codes' });
  }
});

/**
 * DELETE /api/admin/event/:eventId/codes
 * Delete all codes for a specific event
 * DANGER: Use with caution
 */
router.delete('/event/:eventId/codes', async (req, res) => {
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
    console.error('Error deleting event codes:', error);
    res.status(500).json({ error: 'Failed to delete codes' });
  }
});

/**
 * GET /api/admin/health
 * Check admin API health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    admin_api: true,
    authenticated: true,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;