/**
 * Merch MVP Backend Server
 * 
 * Features:
 * - Signature-based minting
 * - IPFS image upload (Pinata)
 * - Event listener (auto code generation)
 * - Admin endpoints
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./database/db');
const { getListenerService } = require('./services/event-listener');

// ============ Configuration ============

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const ENABLE_EVENT_LISTENER = process.env.ENABLE_EVENT_LISTENER === 'true';
const PROCESS_HISTORICAL_EVENTS = process.env.PROCESS_HISTORICAL_EVENTS === 'true';
const HISTORICAL_FROM_BLOCK = process.env.HISTORICAL_FROM_BLOCK || 'earliest';

// ============ Express App ============

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', limiter);

// ============ Routes ============

// Health check
app.get('/health', (req, res) => {
  let backendIssuer = null;
  
  if (process.env.BACKEND_ISSUER_PRIVATE_KEY) {
    try {
      const { Wallet } = require('ethers');
      backendIssuer = new Wallet(process.env.BACKEND_ISSUER_PRIVATE_KEY).address;
    } catch (error) {
      console.error('Error getting backend issuer address:', error.message);
    }
  }
  
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    backendIssuer,
    contractConfigured: !!process.env.MERCH_MANAGER_ADDRESS,
    features: {
      eventListener: ENABLE_EVENT_LISTENER,
      imageUpload: !!process.env.PINATA_JWT,
      dynamicEvents: true
    }
  });
});

// Event listener health check
app.get('/health/listener', async (req, res) => {
  if (!ENABLE_EVENT_LISTENER) {
    return res.json({
      status: 'disabled',
      message: 'Event listener is disabled in configuration'
    });
  }
  
  try {
    const listener = getListenerService();
    const health = await listener.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Import route modules
const claimsRoutes = require('./routes/claims');
const eventsRoutes = require('./routes/events');

// Mount routes
app.use('/api', claimsRoutes);
app.use('/api/events', eventsRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Metadata routes (if exists)
try {
  const metadataRoutes = require('./routes/metadata');
  app.use('/api', metadataRoutes);
} catch (e) {
  console.log('⚠️  Metadata routes not found - skipping');
}

// Attestation routes (if exists)
try {
  const attestationRoutes = require('./routes/attestations');
  app.use('/api', attestationRoutes);
} catch (e) {
  console.log('⚠️  Attestation routes not found - skipping');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============ Startup ============

async function startServer() {
  try {
    console.log('\n🚀 Starting Merch MVP Backend...\n');
    
    // Initialize database
    await db.initializeDatabase();
    
    // Initialize event listener (if enabled)
    if (ENABLE_EVENT_LISTENER) {
      console.log('🎧 Initializing Event Listener Service...');
      
      const listener = getListenerService();
      await listener.initialize();
      
      // Process historical events (if enabled)
      if (PROCESS_HISTORICAL_EVENTS) {
        await listener.processHistoricalEvents(HISTORICAL_FROM_BLOCK);
      }
      
      // Start listening for new events
      await listener.startListening();
      
      console.log('════════════════════════════════════════');
      console.log('🎉 BACKEND LISTO PARA RECIBIR EVENTOS');
      console.log('════════════════════════════════════════\n');
    } else {
      console.log('⚠️  Event Listener is disabled\n');
    }
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log('✅ Server running on port', PORT);
      console.log('📍 Base URL:', BASE_URL);
      console.log('🌐 Environment:', NODE_ENV);
      console.log('\n════════════════════════════════════════');
      console.log('📋 Available Endpoints:');
      console.log('════════════════════════════════════════');
      console.log('GET    /health');
      console.log('GET    /health/listener');
      console.log('POST   /api/verify-code');
      console.log('POST   /api/events/upload-image');
      console.log('GET    /api/events/image/:hash');
      console.log('GET    /api/admin/stats');
      console.log('GET    /api/admin/list-claims');
      console.log('GET    /api/admin/events-summary');
      console.log('════════════════════════════════════════\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============ Graceful Shutdown ============

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  
  if (ENABLE_EVENT_LISTENER) {
    const listener = getListenerService();
    listener.stopListening();
  }
  
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  
  if (ENABLE_EVENT_LISTENER) {
    const listener = getListenerService();
    listener.stopListening();
  }
  
  await db.closePool();
  process.exit(0);
});

// ============ Start ============

startServer();

module.exports = app;