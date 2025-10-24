/**
 * Database Module - PostgreSQL
 * 
 * Funciones para manejar:
 * - Claims (códigos de acceso)
 * - Batch inserts optimizados
 * - Query helpers
 */

const { Pool } = require('pg');

// ============ Configuration ============

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// ============ Schema Initialization ============

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 Initializing database schema...');
    
    // Create claims table
    await client.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        event_id VARCHAR(66) NOT NULL,
        token_uri TEXT,
        used BOOLEAN DEFAULT false,
        used_by VARCHAR(42),
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_code ON claims(code);
      CREATE INDEX IF NOT EXISTS idx_claims_event_id ON claims(event_id);
      CREATE INDEX IF NOT EXISTS idx_claims_used ON claims(used);
      CREATE INDEX IF NOT EXISTS idx_claims_used_by ON claims(used_by);
    `);
    
    console.log('✅ Database schema initialized\n');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============ Claim Functions ============

/**
 * Get claim by code
 */
async function getClaim(code) {
  const result = await pool.query(
    'SELECT * FROM claims WHERE code = $1',
    [code]
  );
  return result.rows[0];
}

/**
 * Get claims by event ID
 */
async function getClaimsByEventId(eventId) {
  const result = await pool.query(
    'SELECT * FROM claims WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return result.rows;
}

/**
 * Mark claim as used
 */
async function markClaimAsUsed(code, walletAddress) {
  const result = await pool.query(
    `UPDATE claims 
     SET used = true, 
         used_by = $1, 
         used_at = CURRENT_TIMESTAMP 
     WHERE code = $2 AND used = false
     RETURNING *`,
    [walletAddress, code]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Claim not found or already used');
  }
  
  return result.rows[0];
}

/**
 * Insert single claim
 */
async function insertClaim(claimData) {
  const { code, event_id, token_uri, metadata } = claimData;
  
  const result = await pool.query(
    `INSERT INTO claims (code, event_id, token_uri, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [code, event_id, token_uri, JSON.stringify(metadata || {})]
  );
  
  return result.rows[0];
}

/**
 * Insert multiple claims in batch (optimized)
 * 
 * @param {Array} claims - Array of claim objects
 * @returns {Promise<number>} Number of inserted claims
 */
async function insertClaimsBatch(claims) {
  if (!claims || claims.length === 0) {
    return 0;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Build multi-row insert
    const values = [];
    const params = [];
    let paramIndex = 1;
    
    for (const claim of claims) {
      const { code, event_id, token_uri, metadata } = claim;
      
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      params.push(code, event_id, token_uri, JSON.stringify(metadata || {}));
      paramIndex += 4;
    }
    
    const query = `
      INSERT INTO claims (code, event_id, token_uri, metadata)
      VALUES ${values.join(', ')}
      ON CONFLICT (code) DO NOTHING
    `;
    
    const result = await client.query(query, params);
    
    await client.query('COMMIT');
    
    return result.rowCount;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in batch insert:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get stats
 */
async function getStats() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE used = true) as used,
      COUNT(*) FILTER (WHERE used = false) as available
    FROM claims
  `);
  
  const stats = result.rows[0];
  
  return {
    total: parseInt(stats.total),
    used: parseInt(stats.used),
    available: parseInt(stats.available),
    percentage_used: stats.total > 0 
      ? ((stats.used / stats.total) * 100).toFixed(2)
      : '0.00'
  };
}

/**
 * Get claims with pagination
 */
async function getClaimsPaginated(limit = 10, offset = 0, filters = {}) {
  let query = 'SELECT * FROM claims WHERE 1=1';
  const params = [];
  let paramIndex = 1;
  
  // Apply filters
  if (filters.event_id) {
    query += ` AND event_id = $${paramIndex}`;
    params.push(filters.event_id);
    paramIndex++;
  }
  
  if (filters.used !== undefined) {
    query += ` AND used = $${paramIndex}`;
    params.push(filters.used);
    paramIndex++;
  }
  
  if (filters.used_by) {
    query += ` AND used_by = $${paramIndex}`;
    params.push(filters.used_by);
    paramIndex++;
  }
  
  // Add ordering and pagination
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM claims WHERE 1=1';
  const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET
  
  if (filters.event_id) {
    countQuery += ' AND event_id = $1';
  }
  if (filters.used !== undefined) {
    countQuery += ` AND used = $${countParams.length}`;
  }
  if (filters.used_by) {
    countQuery += ` AND used_by = $${countParams.length}`;
  }
  
  const countResult = await pool.query(countQuery, countParams);
  
  return {
    claims: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset
  };
}

/**
 * Delete claims by event ID (admin only)
 */
async function deleteClaimsByEventId(eventId) {
  const result = await pool.query(
    'DELETE FROM claims WHERE event_id = $1 RETURNING *',
    [eventId]
  );
  return result.rowCount;
}

/**
 * Get events summary
 */
async function getEventsSummary() {
  const result = await pool.query(`
    SELECT 
      event_id,
      COUNT(*) as total_codes,
      COUNT(*) FILTER (WHERE used = true) as used_codes,
      COUNT(*) FILTER (WHERE used = false) as available_codes,
      MIN(created_at) as created_at
    FROM claims
    GROUP BY event_id
    ORDER BY created_at DESC
  `);
  
  return result.rows.map(row => ({
    event_id: row.event_id,
    total_codes: parseInt(row.total_codes),
    used_codes: parseInt(row.used_codes),
    available_codes: parseInt(row.available_codes),
    created_at: row.created_at
  }));
}

/**
 * Close database connection pool
 */
async function closePool() {
  await pool.end();
  console.log('✅ Database connection pool closed');
}

// ============ Export ============

module.exports = {
  pool,
  initializeDatabase,
  getClaim,
  getClaimsByEventId,
  markClaimAsUsed,
  insertClaim,
  insertClaimsBatch,
  getStats,
  getClaimsPaginated,
  deleteClaimsByEventId,
  getEventsSummary,
  closePool
};