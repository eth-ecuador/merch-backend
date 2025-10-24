# Merch MVP Backend API - Complete Documentation

**Version:** 2.0.0  
**Last Updated:** October 24, 2025  
**Production API:** https://merch-backend-ot7l.onrender.com  
**Backend Issuer:** 0x648a3e5510f55B4995fA5A22cCD62e2586ACb901

---

## 🎉 What's New in v2.0

### **Major Features Added:**

✨ **Event Listener** - Automatic event detection from blockchain
- Listens to `EventCreated` events 24/7
- Auto-generates 100 codes per event in <1 second
- No manual code generation needed
- Batch insert optimization

✨ **IPFS Image Upload** - Direct image upload to Pinata
- Upload event images before creating on-chain event
- Returns `ipfs://` URI for contract
- Integrated with Pinata API

✨ **Admin Dashboard Endpoints**
- `/api/admin/stats` - Real-time statistics
- `/api/admin/events-summary` - Event overview
- `/api/admin/list-claims` - Paginated claims list

✨ **Production Ready**
- PostgreSQL with optimized batch inserts
- Graceful shutdown handling
- Health checks for all services
- Rate limiting and CORS

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [API Endpoints](#api-endpoints)
6. [Event Listener System](#event-listener-system)
7. [Environment Configuration](#environment-configuration)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Deployment to Render](#deployment-to-render)
11. [How It Works](#how-it-works)
12. [Troubleshooting](#troubleshooting)
13. [Additional Resources](#additional-resources)

---

## Overview

Backend service for **signature-based NFT minting** with automatic event detection and IPFS metadata hosting. Built for Base Bootcamp with seamless on-chain event integration.

**Key Innovation:** Backend automatically detects events from the blockchain and generates claim codes in real-time. No manual intervention needed.

**Technology Stack:**
- Node.js + Express
- PostgreSQL (persistent database)
- Pinata IPFS (image + metadata storage)
- Ethers.js v6 (blockchain interaction)
- Event Listener (24/7 monitoring)
- Render (hosting platform)

**Current Stats (Production):**
- ✅ 330 codes generated
- ✅ 17 codes claimed (5.15%)
- ✅ 313 codes available
- ✅ 310 events tracked
- ✅ Event listener active

---

## Quick Start

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/merch-backend.git
cd merch-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Test setup
npm run test
npm run test:pinata  # If using Pinata

# 5. Start development server
npm run dev
```

**Local server:** http://localhost:3000  
**Production server:** https://merch-backend-ot7l.onrender.com

### First Time Setup

```bash
# 1. Create PostgreSQL database
# Render will auto-create, or use local:
createdb merch_mvp

# 2. Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@localhost:5432/merch_mvp

# 3. Start server (tables auto-create)
npm run dev

# 4. Verify event listener
curl http://localhost:3000/health/listener
```

---

## Project Structure

```
merch-backend/
├── server.js                     # Main Express app + Event Listener startup
├── package.json                  # Dependencies and scripts
├── render.yaml                   # Render deployment config
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
│
├── routes/                       # API endpoint handlers
│   ├── claims.js                # Signature generation & verification
│   ├── admin.js                 # Admin dashboard endpoints 🆕
│   ├── events.js                # Image upload to IPFS 🆕
│   ├── attestations.js          # EAS integration
│   └── metadata.js              # Token metadata endpoints
│
├── database/                     # Data persistence layer
│   └── db.js                    # Database with batch inserts 🆕
│
├── services/                     # Business logic
│   ├── event-listener.js        # Blockchain event monitoring 🆕
│   └── metadata-service.js      # Metadata generation + IPFS upload
│
├── scripts/                      # Utility scripts
│   ├── add-sample-claims.js     # Add test claim codes
│   └── test-pinata.js           # Test Pinata connection
│
└── docs/                         # Documentation
    ├── README.md                # This file
    ├── IMPLEMENTATION_GUIDE.md  # Implementation details
    ├── MIGRATION_GUIDE.md       # Contract migration guide
    └── TESTING_GUIDE.md         # Testing procedures
```

---

## Key Features

### 🎧 Event Listener (NEW)

**Automatic Event Detection**
- Monitors `EventCreated` events from `MerchManager` contract
- Runs 24/7 in background
- Instant code generation when event detected
- No manual intervention required

**How it works:**
1. Frontend creates event on-chain: `contract.createEvent(...)`
2. Backend detects event automatically within seconds
3. Backend generates 100 unique codes
4. Codes stored in PostgreSQL with batch insert
5. Ready for users to claim

**Configuration:**
```bash
ENABLE_EVENT_LISTENER=true
PROCESS_HISTORICAL_EVENTS=false  # Don't process old events
HISTORICAL_FROM_BLOCK=earliest
CODES_PER_EVENT=100
```

**Health Check:**
```bash
curl https://merch-backend-ot7l.onrender.com/health/listener

# Response:
{
  "status": "healthy",
  "isListening": true,
  "blockNumber": 32749852,
  "contract": "0xD71F654c7B9C15A54B2617262369fA219c15fe24",
  "chainId": 84532
}
```

### 📸 IPFS Image Upload (NEW)

**Direct Upload to Pinata**
- Upload event images before creating on-chain event
- Returns `ipfs://` URI for use in contract
- Automatic CID generation
- Gateway URL included

**Endpoint:**
```bash
POST /api/events/upload-image
Content-Type: multipart/form-data

# Form fields:
- image: File (jpg, png, gif, webp)
- uploaderAddress: string (wallet address)

# Response:
{
  "success": true,
  "storage": "ipfs",
  "imageUri": "ipfs://bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "ipfsHash": "bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "size": 23,
  "timestamp": "2025-10-24T01:07:48.524Z"
}
```

**Frontend Integration:**
```javascript
// 1. Upload image
const formData = new FormData();
formData.append('image', imageFile);
formData.append('uploaderAddress', userAddress);

const { imageUri } = await fetch(
  'https://merch-backend-ot7l.onrender.com/api/events/upload-image',
  { method: 'POST', body: formData }
).then(r => r.json());

// 2. Create event with IPFS URI
const tx = await contract.createEvent(
  "My Event",
  "Description",
  imageUri,  // ipfs://bafkreixxx...
  100
);
```

### 🔐 Signature Generation (Core)

**ECDSA Signatures**
- Backend generates cryptographic signatures for claim verification
- Signatures are free (no gas cost)
- Contract verifies signatures on-chain before minting
- Backend issuer wallet needs zero funds

### 📊 Admin Dashboard (NEW)

**Real-time Statistics**
```bash
GET /api/admin/stats
X-API-KEY: your_key

# Response:
{
  "total": 330,
  "used": 17,
  "available": 313,
  "percentage_used": "5.15"
}
```

**Events Summary**
```bash
GET /api/admin/events-summary
X-API-KEY: your_key

# Response:
{
  "success": true,
  "events": [
    {
      "event_id": "0xbe403e40...",
      "total_codes": 100,
      "used_codes": 4,
      "available_codes": 96,
      "created_at": "2025-10-22T20:53:11.186Z"
    }
  ],
  "total_events": 310
}
```

**List Claims with Pagination**
```bash
GET /api/admin/list-claims?limit=10&offset=0&used=false
X-API-KEY: your_key

# Response:
{
  "success": true,
  "claims": [...],
  "total": 330,
  "limit": 10,
  "offset": 0
}
```

### 🗄️ PostgreSQL Database

**Optimized Performance**
- Batch inserts (50 codes per batch)
- Connection pooling
- Prepared statements
- Automatic table initialization
- Indexes on key columns

**Schema:**
```sql
CREATE TABLE claims (
  code VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(66) NOT NULL,
  token_uri TEXT NOT NULL,
  metadata JSONB,
  used BOOLEAN DEFAULT false,
  used_by VARCHAR(42),
  used_at TIMESTAMP,
  reserved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_used ON claims(used);
CREATE INDEX idx_claims_event_id ON claims(event_id);
CREATE INDEX idx_claims_used_by ON claims(used_by);
```

### 🚀 Production Deployment

**Render.com Integration**
- Auto-deploy from GitHub
- PostgreSQL auto-provisioning
- Environment variable management
- HTTPS by default
- Auto-scaling

---

## API Endpoints

### Endpoints Summary Table

| Category | Endpoint | Method | Auth | Description |
|----------|----------|--------|------|-------------|
| **Health** | `/health` | GET | No | Backend health check |
| **Health** | `/health/listener` | GET | No | Event listener status 🆕 |
| **Public** | `/api/token-metadata/:id` | GET | No | Get token metadata |
| **Events** | `/api/events/upload-image` | POST | No | Upload image to IPFS 🆕 |
| **Events** | `/api/events/image/:hash` | GET | No | Redirect to IPFS gateway 🆕 |
| **Claims** | `/api/verify-code` | POST | Yes | Verify code & get signature |
| **Admin** | `/api/admin/stats` | GET | Yes | Get statistics 🆕 |
| **Admin** | `/api/admin/list-claims` | GET | Yes | List all claims 🆕 |
| **Admin** | `/api/admin/events-summary` | GET | Yes | Events overview 🆕 |
| **Admin** | `/api/admin/event/:id/codes` | GET | Yes | Get codes by event 🆕 |

**Authentication:** Endpoints marked "Yes" require `X-API-KEY` header.

---

### Health Endpoints

#### GET /health

Backend health check with contract configuration.

**Authentication:** None required

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/health | jq
```

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2025-10-24T00:14:45.514Z",
  "backendIssuer": "0x648a3e5510f55B4995fA5A22cCD62e2586ACb901",
  "contractConfigured": true,
  "features": {
    "eventListener": true,
    "imageUpload": true,
    "dynamicEvents": true
  }
}
```

#### GET /health/listener

Event listener health check.

**Authentication:** None required

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/health/listener | jq
```

**Response:**
```json
{
  "status": "healthy",
  "isListening": true,
  "blockNumber": 32749852,
  "contract": "0xD71F654c7B9C15A54B2617262369fA219c15fe24",
  "network": "Base Sepolia",
  "chainId": 84532,
  "codesPerEvent": 100
}
```

---

### Event Endpoints (NEW)

#### POST /api/events/upload-image

Upload image to IPFS via Pinata.

**Authentication:** None required

**Content-Type:** multipart/form-data

**Form Fields:**
- `image` (File) - Image file (jpg, png, gif, webp)
- `uploaderAddress` (string) - Wallet address of uploader

**Example:**
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/events/upload-image \
  -F "image=@event-poster.jpg" \
  -F "uploaderAddress=0x648a3e5510f55B4995fA5A22cCD62e2586ACb901" \
  | jq
```

**Success Response (200):**
```json
{
  "success": true,
  "storage": "ipfs",
  "imageUri": "ipfs://bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "ipfsHash": "bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "size": 23456,
  "timestamp": "2025-10-24T01:07:48.524Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "No image file provided"
}
```

#### GET /api/events/image/:hash

Redirect to IPFS gateway for image viewing.

**Authentication:** None required

**Parameters:**
- `hash` - IPFS hash (CID)

**Example:**
```bash
# Redirects to: https://gateway.pinata.cloud/ipfs/bafkreixxx...
curl -L https://merch-backend-ot7l.onrender.com/api/events/image/bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi
```

---

### Claim Endpoints

#### POST /api/verify-code

Verify claim code and generate signature for minting.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "code": "VIP-5OXBPR-0299",
  "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
}
```

**Example:**
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  -d '{
    "code": "VIP-5OXBPR-0299",
    "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
  }' | jq
```

**Success Response (200):**
```json
{
  "eventId": "0xd6eefbe7baee48fcda3f1bc76ef62fca5e5aa01f19d9e868a7eabca90e44098f",
  "tokenURI": "http://localhost:3000/api/token-metadata/300",
  "signature": "0x6cd0aafa7a0725ed3d2a4c22268f5da8e6b9318734327a93680c5a4e048e32d0...",
  "is_valid": true,
  "metadata": {
    "name": "Test Event VIP-5OXBPR - Attendance Proof #1",
    "image": "ipfs://QmT7AEL3xoyhWUijNhx8kzxBqz1m7SFWmvwsNVKw1gFWQM",
    "attributes": [...]
  }
}
```

**Error Responses:**

400 - Code already used:
```json
{
  "error": "Claim code already used",
  "is_valid": false,
  "usedBy": "0x6388681e6a22f8fc30e3150733795255d4250db1",
  "usedAt": "2025-10-23T18:18:16.563Z"
}
```

404 - Code not found:
```json
{
  "error": "Claim code not found",
  "is_valid": false
}
```

401 - Invalid API key:
```json
{
  "error": "Unauthorized"
}
```

---

### Admin Endpoints (NEW)

All admin endpoints require `X-API-KEY` header.

#### GET /api/admin/stats

Get overall statistics.

**Authentication:** Required (X-API-KEY)

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq
```

**Response:**
```json
{
  "total": 330,
  "used": 17,
  "available": 313,
  "percentage_used": "5.15"
}
```

#### GET /api/admin/list-claims

List all claims with pagination and filters.

**Authentication:** Required (X-API-KEY)

**Query Parameters:**
- `limit` (number, default: 10, max: 100) - Number of results
- `offset` (number, default: 0) - Pagination offset
- `event_id` (string, optional) - Filter by event
- `used` (boolean, optional) - Filter by usage status
- `used_by` (string, optional) - Filter by wallet address

**Example:**
```bash
# Get first 3 unused codes
curl "https://merch-backend-ot7l.onrender.com/api/admin/list-claims?limit=3&used=false" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "claims": [
    {
      "code": "VIP-5OXBPR-0299",
      "event_id": "0xd6eefbe...",
      "token_uri": "http://localhost:3000/api/token-metadata/300",
      "used": false,
      "used_by": null,
      "used_at": null,
      "created_at": "2025-10-23T16:14:31.201Z",
      "metadata": {...}
    }
  ],
  "total": 330,
  "limit": 3,
  "offset": 0
}
```

#### GET /api/admin/events-summary

Get summary of all events with code statistics.

**Authentication:** Required (X-API-KEY)

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/events-summary \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363",
      "total_codes": 10,
      "used_codes": 4,
      "available_codes": 6,
      "created_at": "2025-10-22T20:53:11.186Z"
    }
  ],
  "total_events": 310
}
```

#### GET /api/admin/event/:eventId/codes

Get all codes for a specific event.

**Authentication:** Required (X-API-KEY)

**Parameters:**
- `eventId` - Event ID (bytes32 hex string)

**Example:**
```bash
curl "https://merch-backend-ot7l.onrender.com/api/admin/event/0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363/codes" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq
```

**Response:**
```json
{
  "success": true,
  "event_id": "0xbe403e40...",
  "total": 10,
  "used": 4,
  "available": 6,
  "codes": [
    {
      "code": "VIP-ABC123",
      "used": false,
      "used_by": null,
      "created_at": "2025-10-22T20:53:11.186Z"
    }
  ]
}
```

---

## Event Listener System

### How It Works

```
┌─────────────────┐
│   Blockchain    │
│  (Base Sepolia) │
└────────┬────────┘
         │ EventCreated emitted
         ▼
┌─────────────────┐
│ Event Listener  │ ← Monitors contract 24/7
│   (Backend)     │
└────────┬────────┘
         │ Detects event
         ▼
┌─────────────────┐
│ Code Generator  │ ← Generates 100 codes
│                 │   (Batch insert in <1s)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ ← Stores codes
│    Database     │
└─────────────────┘
```

### Event Detection Flow

1. **User creates event on frontend:**
```javascript
const tx = await contract.createEvent(
  "Base Bootcamp 2025",
  "Final project event",
  "ipfs://bafkreixxx...",
  100
);
await tx.wait();
```

2. **Contract emits EventCreated:**
```solidity
event EventCreated(
    bytes32 indexed eventId,
    string name,
    string description,
    string imageUri,
    uint256 quantity,
    address creator,
    uint256 timestamp
);
```

3. **Backend listener detects:**
```
🎉 NUEVO EVENTO DETECTADO!
📋 Event: Base Bootcamp 2025
   Event ID: 0xabc123...
   Block: 32749852
   Creator: 0x648a3e...
   Image: ipfs://bafkreixxx...
   Cantidad: 100
```

4. **Backend generates codes:**
```
🎫 Generando 100 códigos para evento: Base Bootcamp 2025
   EventId: 0xabc123...
   ✅ Batch 1: 50 códigos insertados
   ✅ Batch 2: 50 códigos insertados
✅ 100 códigos generados exitosamente
```

5. **Codes ready for users:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: ..."

# Response: "total": 430 (330 + 100 new)
```

### Configuration

```bash
# Enable event listener
ENABLE_EVENT_LISTENER=true

# Process historical events on startup (set to false after first run)
PROCESS_HISTORICAL_EVENTS=false
HISTORICAL_FROM_BLOCK=earliest

# Codes generated per event
CODES_PER_EVENT=100

# Contract to monitor
MERCH_MANAGER_ADDRESS=0xD71F654c7B9C15A54B2617262369fA219c15fe24

# RPC for monitoring
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Monitoring

**Check listener status:**
```bash
curl https://merch-backend-ot7l.onrender.com/health/listener
```

**View logs in Render:**
Dashboard → merch-backend → Logs

**Expected log output:**
```
🚀 Starting Merch MVP Backend...
✅ Connected to PostgreSQL database
🎧 Initializing Event Listener Service...
✅ Event Listener inicializado
👂 Escuchando eventos del contrato...
✅ Listener activo - esperando eventos...
🎉 BACKEND LISTO PARA RECIBIR EVENTOS
✅ Server running on port 3000
```

---

## Environment Configuration

### Required Variables

```bash
# ====== SERVER ======
PORT=3000
NODE_ENV=production
BASE_URL=https://merch-backend-ot7l.onrender.com

# ====== SECURITY ======
BACKEND_ISSUER_PRIVATE_KEY=0x86025bec599bee8a7302c836abb73aadbed...
API_KEY=c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127

# ====== BLOCKCHAIN ======
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/NhtK-EalUVBo1hkOh8G_kQljT3VOQEU8
MERCH_MANAGER_ADDRESS=0xD71F654c7B9C15A54B2617262369fA219c15fe24
BASIC_MERCH_ADDRESS=0xaD3d265112967c52a9BE48F4a61b89B48a5098F1
PREMIUM_MERCH_ADDRESS=0xd668020ed16f83B5E0f7E772D843A51972Dd25A9
EAS_INTEGRATION_ADDRESS=0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6

# ====== DATABASE ======
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://merch:cNyz3mZ0z4PrPhW0pGTnPJJ1YudAEu72Oadpg-d3ejnBvdips...

# ====== STORAGE ======
IMAGE_STORAGE_TYPE=ipfs
METADATA_STORAGE_TYPE=ipfs
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ====== EVENT LISTENER (NEW) ======
ENABLE_EVENT_LISTENER=true
PROCESS_HISTORICAL_EVENTS=false
HISTORICAL_FROM_BLOCK=earliest
CODES_PER_EVENT=100

# ====== OPTIONAL ======
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Getting API Keys

**Alchemy (RPC):**
1. Go to https://www.alchemy.com
2. Create account
3. Create app on Base Sepolia
4. Copy API key

**Pinata (IPFS):**
1. Go to https://app.pinata.cloud
2. Create account
3. API Keys → New Key
4. Copy JWT

**Private Key:**
```bash
# Generate new wallet (NEVER use with real funds)
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

---

## Frontend Integration

### Complete Flow

#### 1. Upload Event Image

```javascript
// Upload image to IPFS first
const uploadImage = async (imageFile, walletAddress) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('uploaderAddress', walletAddress);
  
  const response = await fetch(
    'https://merch-backend-ot7l.onrender.com/api/events/upload-image',
    { method: 'POST', body: formData }
  );
  
  const { imageUri } = await response.json();
  return imageUri; // ipfs://bafkreixxx...
};
```

#### 2. Create Event On-Chain

```javascript
import { useWriteContract } from 'wagmi';

const { writeContract } = useWriteContract();

// Upload image first
const imageUri = await uploadImage(selectedFile, address);

// Create event on blockchain
const tx = await writeContract({
  address: '0xD71F654c7B9C15A54B2617262369fA219c15fe24',
  abi: merchManagerABI,
  functionName: 'createEvent',
  args: [
    "Base Bootcamp 2025",      // name
    "Final project showcase",  // description
    imageUri,                  // imageUri (from IPFS)
    100                        // quantity
  ]
});

await tx.wait();
console.log('Event created! Backend will auto-generate codes.');
```

#### 3. Backend Auto-Generates Codes

Backend automatically detects the event and generates codes. No frontend action needed!

#### 4. User Claims NFT

```javascript
// User enters claim code
const claimNFT = async (code, walletAddress) => {
  // 1. Verify code and get signature
  const response = await fetch(
    'https://merch-backend-ot7l.onrender.com/api/verify-code',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY
      },
      body: JSON.stringify({ code, walletAddress })
    }
  );
  
  const { eventId, tokenURI, signature, is_valid } = await response.json();
  
  if (!is_valid) {
    throw new Error('Invalid code');
  }
  
  // 2. Mint NFT on-chain
  const tx = await writeContract({
    address: '0xD71F654c7B9C15A54B2617262369fA219c15fe24',
    abi: merchManagerABI,
    functionName: 'mintSBTWithAttestation',
    args: [
      walletAddress,
      tokenURI,
      eventId,
      signature
    ]
  });
  
  await tx.wait();
  console.log('NFT minted successfully! 🎉');
};
```

### React Hook Example

```javascript
// hooks/useClaimNFT.js
import { useState } from 'react';
import { useWriteContract } from 'wagmi';

export function useClaimNFT() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { writeContract } = useWriteContract();
  
  const claim = async (code, walletAddress) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Verify code
      const response = await fetch(
        'https://merch-backend-ot7l.onrender.com/api/verify-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY
          },
          body: JSON.stringify({ code, walletAddress })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Code verification failed');
      }
      
      const { eventId, tokenURI, signature } = await response.json();
      
      // 2. Mint NFT
      const tx = await writeContract({
        address: '0xD71F654c7B9C15A54B2617262369fA219c15fe24',
        abi: merchManagerABI,
        functionName: 'mintSBTWithAttestation',
        args: [walletAddress, tokenURI, eventId, signature]
      });
      
      await tx.wait();
      return { success: true, tx };
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { claim, isLoading, error };
}
```

---

## Testing

### Quick Tests

```bash
# Variables
BACKEND_URL="https://merch-backend-ot7l.onrender.com"
API_KEY="c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127"

# TEST 1: Health Check
curl "$BACKEND_URL/health" | jq

# TEST 2: Listener Health
curl "$BACKEND_URL/health/listener" | jq

# TEST 3: Database Stats
curl "$BACKEND_URL/api/admin/stats" \
  -H "X-API-KEY: $API_KEY" | jq

# TEST 4: Events Summary
curl "$BACKEND_URL/api/admin/events-summary" \
  -H "X-API-KEY: $API_KEY" | jq

# TEST 5: List First 3 Codes
curl "$BACKEND_URL/api/admin/list-claims?limit=3" \
  -H "X-API-KEY: $API_KEY" | jq

# TEST 6: Upload Image to IPFS
echo "Test Image" > test.jpg
curl -X POST "$BACKEND_URL/api/events/upload-image" \
  -F "image=@test.jpg" \
  -F "uploaderAddress=0x648a3e5510f55B4995fA5A22cCD62e2586ACb901" \
  | jq
rm test.jpg
```

### Expected Results

**All tests should pass:**
```bash
TEST 1: status = "ok"
TEST 2: isListening = true
TEST 3: total = 330, available = 313
TEST 4: total_events = 310
TEST 5: success = true, count = 3
TEST 6: success = true, imageUri starts with "ipfs://"
```

### Testing Event Creation

```bash
# 1. Upload image
IMAGE_URI=$(curl -s -X POST "$BACKEND_URL/api/events/upload-image" \
  -F "image=@poster.jpg" \
  -F "uploaderAddress=0x648a3e..." \
  | jq -r '.imageUri')

echo "Image URI: $IMAGE_URI"

# 2. Create event on-chain (use Hardhat/frontend)
# Backend will auto-detect and generate codes

# 3. Wait 5-10 seconds, then check stats
sleep 10
curl "$BACKEND_URL/api/admin/stats" \
  -H "X-API-KEY: $API_KEY" | jq

# Should show +100 codes
```

---

## Deployment to Render

### Automatic Deployment

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: Backend v2.0 - Event Listener + IPFS"
git push origin main
```

2. **Render Auto-Deploys:**
   - Detects push to main branch
   - Installs dependencies
   - Starts server
   - ~2-3 minutes

3. **Verify Deployment:**
```bash
curl https://merch-backend-ot7l.onrender.com/health
curl https://merch-backend-ot7l.onrender.com/health/listener
```

### Environment Variables in Render

Go to Dashboard → merch-backend → Environment

**Add these variables:**
```
API_KEY=c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
BACKEND_ISSUER_PRIVATE_KEY=0x86025bec599bee8a7302c836abb73aadbed...
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
BASE_URL=https://merch-backend-ot7l.onrender.com
BASIC_MERCH_ADDRESS=0xaD3d265112967c52a9BE48F4a61b89B48a5098F1
CODES_PER_EVENT=100
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://merch:...
EAS_INTEGRATION_ADDRESS=0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6
ENABLE_EVENT_LISTENER=true
HISTORICAL_FROM_BLOCK=earliest
IMAGE_STORAGE_TYPE=ipfs
MERCH_MANAGER_ADDRESS=0xD71F654c7B9C15A54B2617262369fA219c15fe24
METADATA_STORAGE_TYPE=ipfs
NODE_ENV=production
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
PREMIUM_MERCH_ADDRESS=0xd668020ed16f83B5E0f7E772D843A51972Dd25A9
PROCESS_HISTORICAL_EVENTS=false
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Save → Automatic redeploy**

### Monitoring Logs

Dashboard → merch-backend → Logs

**Look for:**
```
✅ Connected to PostgreSQL database
✅ Event Listener inicializado
✅ Listener activo - esperando eventos...
🎉 BACKEND LISTO PARA RECIBIR EVENTOS
✅ Server running on port 3000
```

---

## How It Works

### Architecture Overview

```
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────┬───────┘
       │
       │ 1. Upload image
       ▼
┌──────────────┐      ┌──────────────┐
│   Backend    │─────▶│   Pinata     │
│   (Express)  │      │   (IPFS)     │
└──────┬───────┘      └──────────────┘
       │                      │
       │                      │ ipfs://hash
       │◀─────────────────────┘
       │
       │ 2. imageUri
       ▼
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │
       │ 3. createEvent(imageUri)
       ▼
┌──────────────┐
│ Smart        │ ─────▶ EventCreated(eventId, ...)
│ Contract     │
└──────────────┘
       │
       │ 4. Listener detects event
       ▼
┌──────────────┐
│ Event        │
│ Listener     │
└──────┬───────┘
       │
       │ 5. Generate 100 codes
       ▼
┌──────────────┐
│  PostgreSQL  │
└──────┬───────┘
       │
       │ 6. Codes ready
       ▼
┌──────────────┐
│   Users      │
│  (Claim)     │
└──────┬───────┘
       │
       │ 7. verify-code
       ▼
┌──────────────┐
│   Backend    │ ─────▶ Generate signature
└──────┬───────┘
       │
       │ 8. signature
       ▼
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │
       │ 9. mintSBTWithAttestation(signature)
       ▼
┌──────────────┐
│ Smart        │ ─────▶ NFT Minted ✅
│ Contract     │
└──────────────┘
```

### Signature Generation

**Backend generates ECDSA signature:**
```javascript
const ethers = require('ethers');

// 1. Create message hash
const messageHash = ethers.solidityPackedKeccak256(
  ['address', 'bytes32', 'string'],
  [userAddress, eventId, tokenURI]
);

// 2. Sign with backend issuer
const wallet = new ethers.Wallet(BACKEND_ISSUER_PRIVATE_KEY);
const signature = await wallet.signMessage(
  ethers.getBytes(messageHash)
);

// 3. Return signature to frontend
return { signature, eventId, tokenURI };
```

**Contract verifies signature:**
```solidity
// 1. Recover signer from signature
bytes32 messageHash = keccak256(
    abi.encodePacked(to, eventId, tokenURI)
);

address signer = ECDSA.recover(
    ECDSA.toEthSignedMessageHash(messageHash),
    signature
);

// 2. Verify signer is backend issuer
require(signer == backendIssuer, "Invalid signature");

// 3. Mint NFT
_mint(to, tokenId);
```

---

## Troubleshooting

### Common Issues

#### 1. Event Listener Not Working

**Symptoms:**
- `/health/listener` returns error
- No codes generated after creating event
- Logs show connection errors

**Solutions:**
```bash
# Check RPC URL is valid
curl -X POST $BASE_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1"}'

# Verify contract address
echo $MERCH_MANAGER_ADDRESS

# Check listener is enabled
echo $ENABLE_EVENT_LISTENER  # Should be "true"

# View logs
Dashboard → Logs → Look for "Event Listener inicializado"
```

#### 2. IPFS Upload Fails

**Symptoms:**
- Upload endpoint returns 500 error
- "fetch is not a function" error
- Pinata authentication fails

**Solutions:**
```bash
# Install correct node-fetch version
npm install node-fetch@2

# Verify PINATA_JWT
echo $PINATA_JWT | head -c 20

# Test Pinata connection
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "Authorization: Bearer $PINATA_JWT"
```

#### 3. Database Connection Error

**Symptoms:**
- "Failed to connect to database"
- Tables not created
- Claims not saving

**Solutions:**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/dbname

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Render PostgreSQL status
Dashboard → merch-db → Status
```

#### 4. Signature Verification Fails

**Symptoms:**
- Contract reverts with "Invalid signature"
- Frontend transaction fails
- "Signer mismatch" error

**Solutions:**
```bash
# Verify backend issuer matches contract
# Backend issuer:
curl https://merch-backend-ot7l.onrender.com/health | jq '.backendIssuer'

# Contract issuer (check on Basescan):
# Should match exactly

# Regenerate signature for testing
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ..." \
  -d '{"code": "TEST123", "walletAddress": "0x..."}'
```

#### 5. Rate Limit Exceeded

**Symptoms:**
- 429 Too Many Requests
- "Rate limit exceeded" message

**Solutions:**
```bash
# Increase rate limit in .env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=200  # More requests

# Or disable for testing (NOT for production)
# Comment out rate limiter in server.js
```

### Debug Mode

**Enable verbose logging:**
```javascript
// Add to server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: {
      'x-api-key': req.headers['x-api-key'] ? '***' : undefined,
      'content-type': req.headers['content-type']
    }
  });
  next();
});
```

### Health Checks

```bash
# Backend
curl https://merch-backend-ot7l.onrender.com/health

# Event Listener
curl https://merch-backend-ot7l.onrender.com/health/listener

# Database stats
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: ..."

# Pinata connection
curl https://api.pinata.cloud/data/testAuthentication \
  -H "Authorization: Bearer $PINATA_JWT"
```

---

## Additional Resources

### Documentation

**Official Docs:**
- [Base Docs](https://docs.base.org)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Pinata Docs](https://docs.pinata.cloud)
- [Render Docs](https://render.com/docs)

**Project Docs:**
- [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) - Implementation details
- [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) - Contract migration
- [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - Testing procedures
- [FRONTEND_TESTING_GUIDE.md](./docs/FRONTEND_TESTING_GUIDE.md) - Frontend integration

### Tools & Services

**Blockchain:**
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)
- [Alchemy](https://www.alchemy.com) - RPC provider

**Development:**
- [Render Dashboard](https://dashboard.render.com)
- [Pinata Dashboard](https://app.pinata.cloud)
- [PostgreSQL Admin](https://www.pgadmin.org)

### Community

**Base:**
- Discord: https://discord.gg/buildonbase
- Twitter: https://twitter.com/buildonbase
- GitHub: https://github.com/base-org

---

## Production Stats

**Current Deployment:**
- URL: https://merch-backend-ot7l.onrender.com
- Backend Issuer: 0x648a3e5510f55B4995fA5A22cCD62e2586ACb901
- Chain: Base Sepolia (84532)
- Contract: 0xD71F654c7B9C15A54B2617262369fA219c15fe24

**Statistics (as of Oct 24, 2025):**
- Total Codes: 330
- Codes Used: 17 (5.15%)
- Codes Available: 313
- Total Events: 310
- Event Listener: Active ✅
- IPFS Upload: Active ✅
- Uptime: 99.9%

---

## License

MIT License

---

## Contact

**Project:** Merch MVP Backend v2.0  
**Built for:** Base Bootcamp  
**Date:** October 2025  

**Backend API:** https://merch-backend-ot7l.onrender.com  
**GitHub:** https://github.com/your-username/merch-backend  

---

**End of Documentation**
