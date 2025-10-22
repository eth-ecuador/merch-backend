// database/db.js
// Database abstraction layer - supports in-memory and PostgreSQL

const { Pool } = require('pg');

// ==============================================
// IN-MEMORY DATABASE (Development)
// ==============================================

class InMemoryDB {
  constructor() {
    this.claims = new Map();
    this.reservations = new Map();
    this.tokenMetadata = new Map();
    console.log('✅ In-memory database initialized');
  }
  
  // Claims
  async createClaim(claim) {
    this.claims.set(claim.code, {
      ...claim,
      used: false,
      usedBy: null,
      usedAt: null,
      reservedBy: null,
      createdAt: new Date().toISOString()
    });
  }
  
  async getClaim(code) {
    return this.claims.get(code) || null;
  }
  
  async markClaimAsUsed(code, walletAddress) {
    const claim = this.claims.get(code);
    if (claim) {
      claim.used = true;
      claim.usedBy = walletAddress;
      claim.usedAt = new Date().toISOString();
      this.claims.set(code, claim);
    }
  }
  
  async updateClaimTokenURI(code, tokenURI) {
    const claim = this.claims.get(code);
    if (claim) {
      claim.tokenURI = tokenURI;
      this.claims.set(code, claim);
    }
  }
  
  async reserveClaim(code, userIdentifier) {
    const claim = this.claims.get(code);
    if (claim) {
      claim.reservedBy = userIdentifier;
      this.claims.set(code, claim);
    }
  }
  
  async getAllClaims() {
    return Array.from(this.claims.values());
  }
  
  // Reservations
  async createReservation(reservation) {
    this.reservations.set(reservation.reservationId, {
      ...reservation,
      createdAt: new Date().toISOString()
    });
  }
  
  async getReservation(reservationId) {
    return this.reservations.get(reservationId) || null;
  }
  
  async getAllReservations() {
    return Array.from(this.reservations.values());
  }
  
  // Token Metadata
  async updateTokenMetadata(tokenId, metadata) {
    this.tokenMetadata.set(tokenId, {
      ...metadata,
      updatedAt: new Date().toISOString()
    });
  }
  
  async getTokenMetadata(tokenId) {
    return this.tokenMetadata.get(tokenId) || null;
  }
}

// ==============================================
// POSTGRESQL DATABASE (Production)
// ==============================================

class PostgresDB {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    });
    
    this.initTables();
    console.log('✅ PostgreSQL database initialized');
  }
  
  async initTables() {
    try {
      // Claims table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS claims (
          code VARCHAR(255) PRIMARY KEY,
          event_id VARCHAR(255) NOT NULL,
          token_uri TEXT NOT NULL,
          metadata JSONB,
          used BOOLEAN DEFAULT FALSE,
          used_by VARCHAR(255),
          used_at TIMESTAMP,
          reserved_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Reservations table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS reservations (
          reservation_id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(255) NOT NULL,
          user_identifier VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          event_id VARCHAR(255) NOT NULL,
          token_uri TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Token metadata table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS token_metadata (
          token_id INTEGER PRIMARY KEY,
          metadata JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ PostgreSQL tables initialized');
    } catch (error) {
      console.error('❌ Error initializing PostgreSQL tables:', error);
      throw error;
    }
  }
  
  // Claims
  async createClaim(claim) {
    await this.pool.query(
      `INSERT INTO claims (code, event_id, token_uri, metadata, used, reserved_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [claim.code, claim.eventId, claim.tokenURI, JSON.stringify(claim.metadata || null), false, null]
    );
  }
  
  async getClaim(code) {
    const result = await this.pool.query(
      'SELECT * FROM claims WHERE code = $1',
      [code]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      code: row.code,
      eventId: row.event_id,
      tokenURI: row.token_uri,
      metadata: row.metadata,
      used: row.used,
      usedBy: row.used_by,
      usedAt: row.used_at,
      reservedBy: row.reserved_by,
      createdAt: row.created_at
    };
  }
  
  async markClaimAsUsed(code, walletAddress) {
    await this.pool.query(
      'UPDATE claims SET used = TRUE, used_by = $1, used_at = NOW() WHERE code = $2',
      [walletAddress, code]
    );
  }
  
  async updateClaimTokenURI(code, tokenURI) {
    await this.pool.query(
      'UPDATE claims SET token_uri = $1 WHERE code = $2',
      [tokenURI, code]
    );
  }
  
  async reserveClaim(code, userIdentifier) {
    await this.pool.query(
      'UPDATE claims SET reserved_by = $1 WHERE code = $2',
      [userIdentifier, code]
    );
  }
  
  async getAllClaims() {
    const result = await this.pool.query('SELECT * FROM claims ORDER BY created_at DESC');
    return result.rows.map(row => ({
      code: row.code,
      eventId: row.event_id,
      tokenURI: row.token_uri,
      metadata: row.metadata,
      used: row.used,
      usedBy: row.used_by,
      usedAt: row.used_at,
      reservedBy: row.reserved_by,
      createdAt: row.created_at
    }));
  }
  
  // Reservations
  async createReservation(reservation) {
    await this.pool.query(
      `INSERT INTO reservations (reservation_id, code, user_identifier, type, event_id, token_uri)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reservation.reservationId,
        reservation.code,
        reservation.userIdentifier,
        reservation.type,
        reservation.eventId,
        reservation.tokenURI
      ]
    );
  }
  
  async getReservation(reservationId) {
    const result = await this.pool.query(
      'SELECT * FROM reservations WHERE reservation_id = $1',
      [reservationId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      reservationId: row.reservation_id,
      code: row.code,
      userIdentifier: row.user_identifier,
      type: row.type,
      eventId: row.event_id,
      tokenURI: row.token_uri,
      createdAt: row.created_at
    };
  }
  
  async getAllReservations() {
    const result = await this.pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
    return result.rows.map(row => ({
      reservationId: row.reservation_id,
      code: row.code,
      userIdentifier: row.user_identifier,
      type: row.type,
      eventId: row.event_id,
      tokenURI: row.token_uri,
      createdAt: row.created_at
    }));
  }
  
  // Token Metadata
  async updateTokenMetadata(tokenId, metadata) {
    await this.pool.query(
      `INSERT INTO token_metadata (token_id, metadata, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (token_id) 
       DO UPDATE SET metadata = $2, updated_at = NOW()`,
      [tokenId, JSON.stringify(metadata)]
    );
  }
  
  async getTokenMetadata(tokenId) {
    const result = await this.pool.query(
      'SELECT metadata FROM token_metadata WHERE token_id = $1',
      [tokenId]
    );
    
    if (result.rows.length === 0) return null;
    
    return result.rows[0].metadata;
  }
}

// ==============================================
// DATABASE FACTORY
// ==============================================

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  
  const dbType = process.env.DATABASE_TYPE || 'memory';
  
  if (dbType === 'postgres') {
    dbInstance = new PostgresDB();
  } else {
    dbInstance = new InMemoryDB();
  }
  
  return dbInstance;
}

// ==============================================
// EXPORTED INTERFACE
// ==============================================

module.exports = {
  async createClaim(claim) {
    const db = await getDB();
    return db.createClaim(claim);
  },
  
  async getClaim(code) {
    const db = await getDB();
    return db.getClaim(code);
  },
  
  async markClaimAsUsed(code, walletAddress) {
    const db = await getDB();
    return db.markClaimAsUsed(code, walletAddress);
  },
  
  async updateClaimTokenURI(code, tokenURI) {
    const db = await getDB();
    return db.updateClaimTokenURI(code, tokenURI);
  },
  
  async reserveClaim(code, userIdentifier) {
    const db = await getDB();
    return db.reserveClaim(code, userIdentifier);
  },
  
  async getAllClaims() {
    const db = await getDB();
    return db.getAllClaims();
  },
  
  async createReservation(reservation) {
    const db = await getDB();
    return db.createReservation(reservation);
  },
  
  async getReservation(reservationId) {
    const db = await getDB();
    return db.getReservation(reservationId);
  },
  
  async getAllReservations() {
    const db = await getDB();
    return db.getAllReservations();
  },
  
  async updateTokenMetadata(tokenId, metadata) {
    const db = await getDB();
    return db.updateTokenMetadata(tokenId, metadata);
  },
  
  async getTokenMetadata(tokenId) {
    const db = await getDB();
    return db.getTokenMetadata(tokenId);
  }
};