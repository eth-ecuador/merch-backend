// server.js
// Merch MVP Backend API - Production Ready for Render
// Handles signature generation, claim verification, and EAS attestations

require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const claimRoutes = require('./routes/claims');
const metadataRoutes = require('./routes/metadata');
const attestationRoutes = require('./routes/attestations');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// CONFIGURATION & VALIDATION
// ==============================================

// Validate required environment variables
const requiredEnvVars = [
  'BACKEND_ISSUER_PRIVATE_KEY',
  'API_KEY',
  'BASE_SEPOLIA_RPC_URL',
  'BASIC_MERCH_ADDRESS',
  'MERCH_MANAGER_ADDRESS',
  'EAS_INTEGRATION_ADDRESS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Backend Issuer Wallet
let backendWallet;
try {
  backendWallet = new ethers.Wallet(process.env.BACKEND_ISSUER_PRIVATE_KEY);
  console.log('✅ Backend Issuer Wallet initialized:', backendWallet.address);
} catch (error) {
  console.error('❌ Invalid BACKEND_ISSUER_PRIVATE_KEY:', error.message);
  process.exit(1);
}

// Initialize Provider
const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
const connectedWallet = backendWallet.connect(provider);

// Contract ABIs
const BASIC_MERCH_ABI = [
  'function backendIssuer() view returns (address)',
  'function mintSBT(address _to, uint256 _eventId, string _tokenURI, bytes _signature) external returns (uint256)'
];

const EAS_INTEGRATION_ABI = [
  'function createAttendanceAttestation(bytes32 _eventId, address _attendee, uint256 _tokenId, bool _isPremiumUpgrade) external returns (bytes32)'
];

// Initialize Contract Instances
const basicMerchContract = new ethers.Contract(
  process.env.BASIC_MERCH_ADDRESS,
  BASIC_MERCH_ABI,
  provider
);

const easContract = new ethers.Contract(
  process.env.EAS_INTEGRATION_ADDRESS,
  EAS_INTEGRATION_ABI,
  connectedWallet
);

// Make available globally
global.backendWallet = backendWallet;
global.provider = provider;
global.connectedWallet = connectedWallet;
global.basicMerchContract = basicMerchContract;
global.easContract = easContract;

// ==============================================
// MIDDLEWARE
// ==============================================

// Security
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-KEY']
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API Key Authentication Middleware
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// ==============================================
// ROUTES
// ==============================================

// Health Check (no auth required)
app.get('/health', async (req, res) => {
  try {
    // Check contract configuration
    const configuredIssuer = await basicMerchContract.backendIssuer();
    const isConfigured = configuredIssuer.toLowerCase() === backendWallet.address.toLowerCase();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      backendIssuer: backendWallet.address,
      contractConfigured: isConfigured,
      network: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL
      },
      contracts: {
        basicMerch: process.env.BASIC_MERCH_ADDRESS,
        merchManager: process.env.MERCH_MANAGER_ADDRESS,
        easIntegration: process.env.EAS_INTEGRATION_ADDRESS
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Mount routes
app.use('/api', claimRoutes);
app.use('/api', metadataRoutes);
app.use('/api', attestationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Merch MVP API',
    version: '1.0.0',
    description: 'Backend API for signature-based NFT minting',
    endpoints: {
      health: 'GET /health',
      verifyClaim: 'POST /api/verify-code',
      claimOffchain: 'POST /api/claim-offchain',
      redeemReservation: 'POST /api/redeem-reservation',
      attestClaim: 'POST /api/attest-claim',
      tokenMetadata: 'GET /api/token-metadata/:id'
    },
    documentation: 'https://github.com/your-repo/docs'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==============================================
// SERVER START
// ==============================================

app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🚀 Merch MVP Backend API');
  console.log('===========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔑 Backend Issuer: ${backendWallet.address}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 API Key: ${process.env.API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log('===========================================');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/verify-code');
  console.log('  POST /api/claim-offchain');
  console.log('  POST /api/redeem-reservation');
  console.log('  POST /api/attest-claim');
  console.log('  GET  /api/token-metadata/:id');
  console.log('===========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;