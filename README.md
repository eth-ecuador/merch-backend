# Merch MVP Backend API - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** October 22, 2025  
**Production API:** https://merch-backend-ot7l.onrender.com  
**Backend Issuer:** 0x648a3e5510f55B4995fA5A22cCD62e2586ACb901

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [API Endpoints](#api-endpoints)
6. [Environment Configuration](#environment-configuration)
7. [Frontend Integration with Base MiniApp](#frontend-integration-with-base-miniapp)
8. [Testing](#testing)
9. [Deployment to Render](#deployment-to-render)
10. [How It Works](#how-it-works)
11. [Cost Analysis](#cost-analysis)
12. [Security](#security)
13. [Available Claim Codes](#available-claim-codes)
14. [Troubleshooting](#troubleshooting)
15. [Additional Resources](#additional-resources)

---

## Overview

Backend service for signature-based NFT minting with IPFS metadata hosting via Pinata. Built for Base Bootcamp and optimized for Base MiniApp integration using React, Next.js, Tailwind CSS, and MiniKit.

**Key Innovation:** Backend generates ECDSA signatures (free) instead of paying gas for minting. Users pay their own gas (~$0.20 on Base Sepolia), enabling unlimited scalability at zero backend cost.

**Technology Stack:**
- Node.js + Express
- PostgreSQL (persistent database)
- Pinata IPFS (metadata storage)
- Ethers.js (signature generation)
- Render (hosting platform)

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

# 5. Add sample data
npm run add-claims

# 6. Start development server
npm run dev
```

**Local server:** http://localhost:3000  
**Production server:** https://merch-backend-ot7l.onrender.com

---

## Project Structure

```
merch-backend/
├── server.js                  # Main Express application
├── package.json               # Dependencies and scripts
├── render.yaml                # Render deployment config
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
│
├── routes/                    # API endpoint handlers
│   ├── claims.js             # Signature generation & verification
│   ├── attestations.js       # EAS integration
│   └── metadata.js           # Token metadata endpoints
│
├── database/                  # Data persistence layer
│   └── db.js                 # Database abstraction (PostgreSQL/In-memory)
│
├── services/                  # Business logic
│   └── metadata-service.js   # Metadata generation + IPFS upload
│
├── scripts/                   # Utility scripts
│   ├── add-sample-claims.js     # Add test claim codes
│   ├── generate-bulk-claims.js  # Generate 200-1000 codes at once
│   ├── test-signature.js     # Test signature generation
│   └── test-pinata.js        # Test Pinata connection
│
└── docs/                      # Documentation
    └── INSTALL_GUIDE.md      # Detailed installation guide
```

---

## Key Features

### Core Functionality

**Signature Generation (ECDSA)**
- Backend generates cryptographic signatures for claim verification
- Signatures are free (no gas cost)
- Contract verifies signatures on-chain before minting
- Backend issuer wallet needs zero funds

**Claim Verification System**
- Single-use claim codes stored in PostgreSQL
- Code validation before signature generation
- Automatic marking as "used" after claim
- Support for event-based claims

**Off-chain Reservations**
- Users can reserve claims without a wallet
- Email, phone, Twitter, or Telegram identifiers
- Redeem reservation later with wallet address
- Prevents code theft before wallet creation

**IPFS via Pinata**
- Automatic metadata upload to IPFS
- Permanent, decentralized storage
- CID-based addressing (ipfs://bafkreixxx...)
- 1GB free tier on Pinata
- Fallback to local storage if IPFS fails

**EAS Attestations**
- On-chain proof of attendance via Ethereum Attestation Service
- Linked to NFT minting
- Permanent blockchain record
- Query attestations by event or user

**PostgreSQL Database**
- Persistent data storage
- Production-ready reliability
- Automatic table initialization
- Connection pooling
- Prepared statements for security

**Production Deployment**
- Render.com integration via Blueprint (render.yaml)
- Auto-scaling and HTTPS
- Environment variable management
- PostgreSQL auto-provisioning
- Continuous deployment from Git

---

## API Endpoints

### Endpoints Summary Table

| Category | Endpoint | Method | Auth | Description |
|----------|----------|--------|------|-------------|
| **Public** | `/health` | GET | No | Health check with contract info |
| **Public** | `/api/token-metadata/:id` | GET | No | Get token metadata (ERC-721) |
| **Protected** | `/api/verify-code` | POST | Yes | Verify code & generate signature |
| **Protected** | `/api/claim-offchain` | POST | Yes | Reserve claim without wallet |
| **Protected** | `/api/redeem-reservation` | POST | Yes | Redeem off-chain reservation |
| **Protected** | `/api/attest-claim` | POST | Yes | Create EAS attestation |
| **Admin** | `/api/admin/add-claim` | POST | Yes | Add single claim code |
| **Admin** | `/api/admin/add-sample-claims` | POST | Yes | Add 10 sample codes |
| **Admin** | `/api/admin/generate-bulk-claims` | POST | Yes | **Generate 1-1000 codes** 🆕 |
| **Admin** | `/api/admin/list-claims` | GET | Yes | List all claims with stats |
| **Admin** | `/api/admin/stats` | GET | Yes | Get statistics overview 🆕 |

**Authentication:** All endpoints marked "Yes" require `X-API-KEY` header.

---


### Public Endpoints

#### GET /health

Health check endpoint with contract configuration.

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T20:51:45.000Z",
  "backendIssuer": "0x648a3e5510f55B4995fA5A22cCD62e2586ACb901",
  "contractConfigured": true,
  "network": {
    "name": "Base Sepolia",
    "chainId": 84532,
    "rpcUrl": "https://sepolia.base.org"
  },
  "contracts": {
    "basicMerch": "0x5eEC061B0A4d5d2Be4aCF831DE73E27e39F442fF",
    "merchManager": "0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C",
    "easIntegration": "0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6"
  }
}
```

---

#### GET /api/token-metadata/:id

Get token metadata JSON (ERC-721 standard).

**Authentication:** None required

**Parameters:**
- `id` - Token ID (number)

**Response:**
```json
{
  "name": "Web3 Summit 2025 - Attendance Proof #1",
  "description": "Soul-bound token proving attendance at Web3 Summit 2025...",
  "image": "ipfs://QmXxxx...",
  "external_url": "https://merch-backend-ot7l.onrender.com/token/1",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Soul Bound Token"
    },
    {
      "trait_type": "Event",
      "value": "Web3 Summit 2025"
    }
  ],
  "properties": {
    "category": "attendance_proof",
    "transferable": false,
    "chain": "base-sepolia"
  }
}
```

---

### Protected Endpoints (Require API Key)

All protected endpoints require the `X-API-KEY` header:

```bash
X-API-KEY: your_api_key_here
```

---

#### POST /api/verify-code

Verify claim code and generate signature for minting.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "code": "TEST123",
  "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
}
```

**Success Response (200):**
```json
{
  "eventId": "0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363",
  "tokenURI": "ipfs://bafkreiczcdvbn2oaxa53v64moqiaz7bjux73c6rkhpg3uy5ixla7r6hjbe",
  "signature": "0x6cd0aafa7a0725ed3d2a4c22268f5da8e6b9318734327a93680c5a4e048e32d0132141070277fe52da679240efc45f1a6c33edc7a90a7c55eca94a803ddf87fa1c",
  "is_valid": true
}
```

**Error Responses:**

400 - Code already used:
```json
{
  "error": "Claim code already used",
  "is_valid": false,
  "usedBy": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB",
  "usedAt": "2025-10-22T20:53:32.000Z"
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

**Example:**
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "code": "TEST123",
    "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
  }'
```

---

#### POST /api/claim-offchain

Reserve a claim for users without wallets.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "code": "DEMO456",
  "userIdentifier": "user@example.com",
  "type": "email"
}
```

**Parameters:**
- `code` - Claim code (string)
- `userIdentifier` - Email, phone, Twitter, or Telegram handle (string)
- `type` - Identifier type: "email", "phone", "twitter", or "telegram" (string)

**Success Response (200):**
```json
{
  "reservationId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "message": "Claim reserved. Redeem on-chain when you create a wallet.",
  "eventId": "0xa53ebf0f688626ec34511fae33f9de72ff3f16562a3014a2ae63b893ced81d63",
  "tokenURI": "ipfs://bafkreixxx..."
}
```

---

#### POST /api/redeem-reservation

Redeem an off-chain reservation with a wallet address.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "reservationId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
}
```

**Success Response (200):**
```json
{
  "eventId": "0xa53ebf0f688626ec34511fae33f9de72ff3f16562a3014a2ae63b893ced81d63",
  "tokenURI": "ipfs://bafkreixxx...",
  "signature": "0x6cd0aafa7a0725ed...",
  "message": "Reservation redeemed successfully"
}
```

---

#### POST /api/attest-claim

Create an EAS attestation for a claim.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "code": "TEST123",
  "attendeeAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
}
```

**Success Response (200):**
```json
{
  "attestationUID": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "transactionHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}
```

---

### Admin Endpoints

#### POST /api/admin/add-claim

Add a single claim code.

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "code": "NEWCODE123",
  "eventId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "tokenURI": "http://localhost:3000/api/token-metadata/100",
  "eventName": "My Event 2025"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "code": "NEWCODE123",
  "eventId": "0x1234567890abcdef...",
  "eventName": "My Event 2025"
}
```

---

#### POST /api/admin/add-sample-claims

Add 10 sample claim codes for testing.

**Authentication:** Required (X-API-KEY)

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "claims": [
    {"code": "TEST123", "event": "Web3 Summit 2025"},
    {"code": "DEMO456", "event": "NFT NYC 2025"},
    {"code": "SAMPLE789", "event": "ETH Denver 2025"},
    {"code": "DEVTEST001", "event": "Web3 Summit 2025"},
    {"code": "ALPHA001", "event": "NFT NYC 2025"},
    {"code": "BETA002", "event": "ETH Denver 2025"},
    {"code": "GAMMA003", "event": "Web3 Summit 2025"},
    {"code": "DELTA004", "event": "NFT NYC 2025"},
    {"code": "EPSILON005", "event": "ETH Denver 2025"},
    {"code": "ZETA006", "event": "Web3 Summit 2025"}
  ]
}
```

**Example:**
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/add-sample-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here"
```

---

#### GET /api/admin/list-claims

List all claims in the database.

**Authentication:** Required (X-API-KEY)

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "claims": [
    {
      "code": "TEST123",
      "eventId": "0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363",
      "used": true,
      "usedBy": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB",
      "usedAt": "2025-10-22T20:53:32.000Z",
      "reservedBy": null,
      "createdAt": "2025-10-22T20:30:00.000Z"
    },
    {
      "code": "DEMO456",
      "eventId": "0xa53ebf0f688626ec34511fae33f9de72ff3f16562a3014a2ae63b893ced81d63",
      "used": false,
      "usedBy": null,
      "usedAt": null,
      "reservedBy": null,
      "createdAt": "2025-10-22T20:30:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/list-claims \
  -H "X-API-KEY: your_api_key_here"
```

---


#### POST /api/admin/generate-bulk-claims

Generate multiple claim codes at once (1-1000 codes in a single request).

**Authentication:** Required (X-API-KEY)

**Request Body:**
```json
{
  "count": 300,
  "prefix": "FRONTEND",
  "eventName": "Base Bootcamp Final Project"
}
```

**Parameters:**
- `count` - Number of codes to generate: 1-1000 (required)
- `prefix` - Code prefix for organization: e.g., "FRONTEND", "TEST", "BASECAMP" (optional, default: "BULK")
- `eventName` - Custom event name for all codes (optional, cycles through default events if not provided)

**Success Response (200):**
```json
{
  "success": true,
  "requested": 300,
  "created": 300,
  "failed": 0,
  "sample_codes": [
    {"code": "FRONTEND-A1B2C3-0000", "event": "Web3 Summit 2025"},
    {"code": "FRONTEND-X9Y8Z7-0001", "event": "NFT NYC 2025"},
    {"code": "FRONTEND-P5Q4R3-0002", "event": "ETH Denver 2025"},
    {"code": "FRONTEND-M8N7K6-0003", "event": "Token2049 Singapore"},
    {"code": "FRONTEND-Z5Y4X3-0004", "event": "Consensus Austin"},
    {"code": "FRONTEND-W2V1U9-0005", "event": "EthCC Paris"},
    {"code": "FRONTEND-T8S7R6-0006", "event": "DevCon Bangkok"},
    {"code": "FRONTEND-Q5P4O3-0007", "event": "Base Camp Miami"},
    {"code": "FRONTEND-N2M1L9-0008", "event": "Blockchain Week NYC"},
    {"code": "FRONTEND-K8J7I6-0009", "event": "Web3 Conference Dubai"}
  ],
  "errors": []
}
```

**Error Responses:**

400 - Invalid count:
```json
{
  "error": "Count must be between 1 and 1000"
}
```

401 - Invalid API key:
```json
{
  "error": "Unauthorized"
}
```

**Examples:**

Generate 300 codes for frontend testing:
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "count": 300,
    "prefix": "FRONTEND"
  }'
```

Generate 100 codes for specific event:
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "count": 100,
    "prefix": "BASECAMP",
    "eventName": "Base Bootcamp Final Project"
  }'
```

Generate 50 QA test codes:
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/generate-bulk-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "count": 50,
    "prefix": "QA"
  }'
```

**Code Format:**
Generated codes follow this pattern: `PREFIX-RANDOM-NUMBER`
- PREFIX: Your chosen prefix or "BULK" (uppercase)
- RANDOM: 6 random alphanumeric characters (uppercase)
- NUMBER: Sequential 4-digit number padded with zeros (0000-9999)

Examples:
- `FRONTEND-A1B2C3-0000`
- `TEST-X9Y8Z7-0125`
- `BASECAMP-M5N6P7-0500`

**Performance:**
- Processes in batches of 50 codes
- Progress logged every 50 codes
- ~1-3 seconds per 100 codes
- For 300 codes: ~3-10 seconds total

**Use Cases:**
1. **Frontend Testing:** Generate codes for development/staging environments
2. **QA Testing:** Create dedicated test codes with QA prefix
3. **Event Preparation:** Pre-generate codes before events
4. **Load Testing:** Generate large batches for performance testing
5. **Multiple Events:** Generate different prefixes for different events

---

#### GET /api/admin/stats

Get claim code statistics (overview of all claims).

**Authentication:** Required (X-API-KEY)

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": 310,
    "used": 5,
    "available": 305,
    "reserved": 0,
    "percentage_used": "1.61"
  }
}
```

**Response Fields:**
- `total` - Total number of claim codes in database
- `used` - Number of codes that have been claimed
- `available` - Number of codes still available
- `reserved` - Number of codes reserved off-chain (not yet claimed)
- `percentage_used` - Percentage of codes that have been used

**Example:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: your_api_key_here"
```

**Use Cases:**
1. **Monitoring:** Check how many codes are left
2. **Capacity Planning:** Know when to generate more codes
3. **Analytics:** Track usage percentage over time
4. **Dashboard:** Display stats in admin dashboard

---
## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory:

```bash
# ====== SERVER CONFIGURATION ======
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# ====== SECURITY ======
# Backend issuer private key (for signature generation only, no funds needed)
BACKEND_ISSUER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# API key for protected endpoints
API_KEY=your_secure_api_key_here

# ====== BLOCKCHAIN CONFIGURATION ======
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Deployed contract addresses
BASIC_MERCH_ADDRESS=0x5eEC061B0A4d5d2Be4aCF831DE73E27e39F442fF
MERCH_MANAGER_ADDRESS=0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C
PREMIUM_MERCH_ADDRESS=0xd668020ed16f83B5E0f7E772D843A51972Dd25A9
EAS_INTEGRATION_ADDRESS=0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6

# ====== DATABASE CONFIGURATION ======
# Type: 'memory' (dev) or 'postgres' (production)
DATABASE_TYPE=postgres

# PostgreSQL Connection String
# For local development:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/merch

# For Render (auto-configured):
# DATABASE_URL=postgresql://merch:xxx@dpg-xxx.oregon-postgres.render.com/merch_b8ol

# ====== METADATA STORAGE ======
# Type: 'local' or 'ipfs'
METADATA_STORAGE_TYPE=ipfs

# Pinata JWT for IPFS uploads (get from https://pinata.cloud)
PINATA_JWT=your_pinata_jwt_here
```

### Production Environment Variables (Render)

When deploying to Render, configure these in the Dashboard:

```bash
# Production URL
BASE_URL=https://merch-backend-ot7l.onrender.com

# Node environment
NODE_ENV=production

# Port (Render auto-configures)
PORT=3000

# Database (Render auto-configures when you connect PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://merch:cNyz...

# All other variables remain the same as local
```

---

## Frontend Integration with Base MiniApp

This section provides complete integration guide for React + Next.js + Tailwind + MiniKit.

### Prerequisites

- Node.js 18+ installed
- Next.js 13+ project
- Tailwind CSS configured
- Basic understanding of React hooks and Wagmi

### Step 1: Install Dependencies

```bash
# Install MiniKit SDK
npm install @farcaster/miniapp-sdk

# Install Web3 dependencies
npm install wagmi viem @tanstack/react-query

# Install ethers (for utils)
npm install ethers
```

### Step 2: MiniApp Configuration

Create or update your root layout to initialize MiniApp:

**File: app/layout.tsx**

```typescript
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import './globals.css';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize MiniApp SDK
    sdk.actions.ready();
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Merch NFT Claim</title>
        <meta name="description" content="Claim your attendance proof NFT" />
        
        {/* MiniApp Embed Metadata */}
        <meta 
          name="fc:miniapp" 
          content={JSON.stringify({
            version: "next",
            imageUrl: "https://your-app.com/embed-image.png",
            button: {
              title: "Claim NFT",
              action: {
                type: "launch_miniapp",
                name: "Merch Claim",
                url: "https://your-app.com"
              }
            }
          })} 
        />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

### Step 3: Create Wagmi Configuration

**File: lib/wagmi.ts**

```typescript
import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'Merch NFT Claim',
      preference: 'smartWalletOnly'
    })
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org')
  }
});
```

### Step 4: Create API Service

**File: lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://merch-backend-ot7l.onrender.com';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

export interface ClaimResponse {
  eventId: string;
  tokenURI: string;
  signature: string;
  is_valid: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  backendIssuer: string;
  contractConfigured: boolean;
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
  };
  contracts: {
    basicMerch: string;
    merchManager: string;
    easIntegration: string;
  };
}

export const api = {
  /**
   * Verify claim code and get signature for minting
   */
  async verifyCode(code: string, walletAddress: string): Promise<ClaimResponse> {
    const response = await fetch(`${API_URL}/api/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ code, walletAddress })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify code');
    }

    return response.json();
  },

  /**
   * Reserve claim without wallet (email/phone/social)
   */
  async claimOffchain(
    code: string, 
    userIdentifier: string, 
    type: 'email' | 'phone' | 'twitter' | 'telegram'
  ) {
    const response = await fetch(`${API_URL}/api/claim-offchain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ code, userIdentifier, type })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reserve claim');
    }

    return response.json();
  },

  /**
   * Redeem reservation with wallet address
   */
  async redeemReservation(reservationId: string, walletAddress: string) {
    const response = await fetch(`${API_URL}/api/redeem-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ reservationId, walletAddress })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to redeem reservation');
    }

    return response.json();
  },

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  }
};
```

### Step 5: Create Claim Component

**File: components/ClaimNFT.tsx**

```typescript
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbiItem } from 'viem';
import { api } from '@/lib/api';

const MERCH_MANAGER_ADDRESS = '0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C';

export default function ClaimNFT() {
  const { address, isConnected } = useAccount();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenURI, setTokenURI] = useState('');

  const { writeContract, data: hash } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!code.trim()) {
      setError('Please enter a claim code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Verifying claim code:', code);
      
      // 1. Get signature from backend
      const result = await api.verifyCode(code.toUpperCase(), address);
      
      console.log('Backend response:', result);
      setTokenURI(result.tokenURI);

      // 2. Call contract to mint with signature
      writeContract({
        address: MERCH_MANAGER_ADDRESS,
        abi: [
          parseAbiItem('function mintSBTWithAttestation(address to, string tokenURI, bytes32 eventId, bytes signature) external')
        ],
        functionName: 'mintSBTWithAttestation',
        args: [
          address, 
          result.tokenURI, 
          result.eventId as `0x${string}`, 
          result.signature as `0x${string}`
        ]
      });

    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Failed to claim NFT');
      setLoading(false);
    }
  };

  // Handle transaction confirmation
  if (isConfirmed && !success) {
    setSuccess(true);
    setLoading(false);
  }

  if (isConfirming) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming transaction...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while your NFT is being minted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Claim Your NFT</h2>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Connect your wallet to claim your NFT</p>
          <div className="text-sm text-gray-500">
            Use the connect button at the top of the page
          </div>
        </div>
      ) : success ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">
              NFT Claimed Successfully!
            </h3>
            <p className="text-green-700 mb-4">
              Your attendance proof NFT has been minted to your wallet
            </p>
            
            {tokenURI && tokenURI.startsWith('ipfs://') && (
              <div className="mb-4 p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Metadata stored on IPFS:</p>
                <a 
                  href={`https://gateway.pinata.cloud/${tokenURI.replace('ipfs://', 'ipfs/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs break-all hover:underline"
                >
                  {tokenURI}
                </a>
              </div>
            )}
            
            <a 
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View on BaseScan
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Claim Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER-CODE-HERE"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400 font-mono"
              disabled={loading}
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the claim code you received at the event
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-red-600 mr-2">⚠️</div>
                <div>
                  <p className="text-red-800 text-sm font-medium">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-200 shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Claim NFT'
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-1">
          <p className="flex items-center justify-between">
            <span>Your wallet:</span>
            <span className="font-mono text-xs">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span>Network:</span>
            <span className="text-xs">Base Sepolia</span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Create Main Page

**File: app/page.tsx**

```typescript
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import ClaimNFT from '@/components/ClaimNFT';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Merch NFT Claim
          </h1>
          <p className="text-xl text-gray-600">
            Claim your soul-bound attendance proof NFT
          </p>
        </div>

        {/* Connect Wallet Section */}
        {!isConnected ? (
          <div className="text-center bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎫</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600">
                Connect your wallet to claim your NFT with your unique code
              </p>
            </div>
            
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full max-w-md mx-auto bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                >
                  {connector.name === 'Coinbase Wallet' && '🔵'}
                  {connector.name === 'Injected' && '🦊'}
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Connected Status */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Claim Component */}
            <ClaimNFT />
          </>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-gray-800 mb-2">Fast & Easy</h3>
            <p className="text-sm text-gray-600">
              Claim your NFT in seconds with just your code
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-gray-800 mb-2">Soul-Bound</h3>
            <p className="text-sm text-gray-600">
              Your attendance proof is permanent and non-transferable
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="font-bold text-gray-800 mb-2">On Base</h3>
            <p className="text-sm text-gray-600">
              Built on Base Sepolia with IPFS metadata storage
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Built with ❤️ for Base Bootcamp</p>
          <div className="flex justify-center gap-4 mt-2">
            <a 
              href="https://sepolia.basescan.org/address/0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Contract
            </a>
            <span>•</span>
            <a 
              href="https://merch-backend-ot7l.onrender.com/health" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              API Status
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
```

### Step 7: Environment Variables

Create `.env.local`:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_URL=https://merch-backend-ot7l.onrender.com
NEXT_PUBLIC_API_KEY=your_secure_api_key_here
```

### Step 8: Create MiniApp Manifest

Create `public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "",
    "payload": "",
    "signature": ""
  },
  "baseBuilder": {
    "allowedAddresses": ["YOUR_BASE_ACCOUNT_ADDRESS_HERE"]
  },
  "miniapp": {
    "version": "1",
    "name": "Merch NFT Claim",
    "homeUrl": "https://your-app.vercel.app",
    "iconUrl": "https://your-app.vercel.app/icon.png",
    "splashImageUrl": "https://your-app.vercel.app/splash.png",
    "splashBackgroundColor": "#0052FF",
    "webhookUrl": "https://your-app.vercel.app/api/webhook",
    "subtitle": "Claim your attendance proof",
    "description": "Claim your soul-bound attendance NFT with a unique code. Built on Base with IPFS metadata storage.",
    "screenshotUrls": [
      "https://your-app.vercel.app/screenshot1.png",
      "https://your-app.vercel.app/screenshot2.png"
    ],
    "primaryCategory": "social",
    "tags": ["nft", "claim", "attendance", "base", "soulbound"],
    "heroImageUrl": "https://your-app.vercel.app/hero.png",
    "tagline": "Claim instantly",
    "ogTitle": "Merch NFT Claim",
    "ogDescription": "Claim your attendance proof NFT on Base",
    "ogImageUrl": "https://your-app.vercel.app/og.png",
    "noindex": false
  }
}
```

### Step 9: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Your app will be live at: https://your-app.vercel.app
```

### Step 10: Generate Account Association

1. Deploy your app to Vercel
2. Go to Base Build: https://build.base.org/account-association
3. Enter your app URL (e.g., your-app.vercel.app)
4. Click "Submit" and "Verify"
5. Sign with your Base Account
6. Copy the generated accountAssociation fields
7. Update your `farcaster.json` manifest file
8. Re-deploy to Vercel

### Step 11: Verify with Base Build

1. Go to: https://build.base.org/preview
2. Enter your app URL
3. Verify:
   - Embeds display correctly
   - Launch button works
   - Account association is valid
   - Manifest metadata is complete

### Step 12: Publish

Create a post in the Base app with your app's URL to publish!

---

## Testing

### Local Testing

#### Test Signature Generation

```bash
npm run test
```

**Expected output:**
```
Testing signature generation...
Generating signature for: 0x742D35cC6634c0532925a3B844BC9E7595F0beBB
Event ID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Token URI: https://example.com/metadata/1
Message Hash: 0xabcdef...
Signature: 0x1234567890abcdef...
✅ Signature generated successfully
```

#### Test Pinata Connection

```bash
npm run test:pinata
```

**Expected output:**
```
Testing Pinata connection...
📤 Uploading test metadata to IPFS...
✅ Upload successful!
IPFS URI: ipfs://bafkreixxx...
Gateway URL: https://gateway.pinata.cloud/ipfs/bafkreixxx...
```

#### Add Sample Claims

```bash
npm run add-claims
```

**Expected output:**
```
Adding sample claims to database...
✅ Added: TEST123 → Web3 Summit 2025
✅ Added: DEMO456 → NFT NYC 2025
... (10 total)
✅ Successfully added 10 sample claims
```

### API Testing

#### Health Check

```bash
curl https://merch-backend-ot7l.onrender.com/health
```

#### Verify Code

```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_api_key_here" \
  -d '{
    "code": "TEST123",
    "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
  }'
```

#### List Claims

```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/list-claims \
  -H "X-API-KEY: your_api_key_here"
```

### Frontend Testing

```typescript
// Test backend connection
import { api } from '@/lib/api';

// 1. Health check
const health = await api.getHealth();
console.log('Backend status:', health.status);
console.log('Backend issuer:', health.backendIssuer);

// 2. Test claim verification
try {
  const result = await api.verifyCode('TEST123', '0x742D35cC6634c0532925a3B844BC9E7595F0beBB');
  console.log('Signature:', result.signature);
  console.log('Token URI:', result.tokenURI);
  console.log('Is IPFS:', result.tokenURI.startsWith('ipfs://'));
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## Deployment to Render

### Prerequisites

- GitHub account
- Render account (free): https://render.com
- Code pushed to GitHub repository

### Step 1: Prepare Code

Ensure your `.gitignore` includes:

```
node_modules/
.env
*.log
.DS_Store
```

Ensure `package.json` has:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 2: Push to GitHub

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Merch MVP Backend ready for production"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/your-username/merch-backend.git

# Push
git branch -M main
git push -u origin main
```

### Step 3: Create PostgreSQL Database

1. Go to Render Dashboard: https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Configuration:
   - Name: `merch-db`
   - Database: `merch_b8ol`
   - User: `merch`
   - Region: Oregon (US West) or closest to you
   - PostgreSQL Version: 16
   - Plan: Free (expires after 90 days)
4. Click "Create Database"
5. Wait for status: "Available" (1-2 minutes)
6. Copy "Internal Database URL" from Info tab

### Step 4: Deploy Web Service

1. Dashboard → "New +" → "Blueprint"
2. Connect your GitHub repository
3. Render detects `render.yaml` automatically
4. Click "Apply"
5. Service group name: `merch-mvp`

### Step 5: Configure Environment Variables

In the Web Service settings:

1. Click "Environment" tab
2. Add each variable:

```bash
# Required
API_KEY=your_secure_api_key_here
BACKEND_ISSUER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
BASE_URL=https://merch-backend-ot7l.onrender.com
BASIC_MERCH_ADDRESS=0x5eEC061B0A4d5d2Be4aCF831DE73E27e39F442fF
MERCH_MANAGER_ADDRESS=0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C
PREMIUM_MERCH_ADDRESS=0xd668020ed16f83B5E0f7E772D843A51972Dd25A9
EAS_INTEGRATION_ADDRESS=0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6

# Database (paste URL from Step 3)
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://merch:cNyz3mZ0z4xxx

# IPFS (optional but recommended)
METADATA_STORAGE_TYPE=ipfs
PINATA_JWT=your_pinata_jwt_here

# RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Environment
NODE_ENV=production
PORT=3000
```

3. Click "Save Changes"

### Step 6: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Or wait for auto-deploy (triggered by git push)
3. Monitor logs in real-time

**Expected logs:**
```
==> Building...
    Running 'npm install'
==> Build successful 🎉
==> Starting service with 'npm start'

✅ Backend Issuer Wallet initialized: 0x648a3e5510f55B4995fA5A22cCD62e2586ACb901
✅ PostgreSQL database initialized
✅ PostgreSQL tables initialized

🚀 Merch MVP Backend API
📡 Server running on port 3000
==> Your service is live 🎉
==> Available at: https://merch-backend-ot7l.onrender.com
```

### Step 7: Verify Deployment

```bash
# Health check
curl https://merch-backend-ot7l.onrender.com/health

# Add sample claims
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/add-sample-claims \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key"

# Test verify-code
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "code": "TEST123",
    "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
  }'
```

### Step 8: Continuous Deployment

Every `git push` to `main` triggers auto-deploy:

```bash
# Make changes
nano server.js

# Commit
git add .
git commit -m "Update: new feature"

# Push (triggers auto-deploy)
git push origin main

# Monitor in Render Dashboard → Logs
```

### Render Configuration Summary

**render.yaml:**
```yaml
services:
  - type: web
    name: merch-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_TYPE
        value: postgres
      # Add all other env vars in Dashboard

databases:
  - name: merch-db
    plan: free
    databaseName: merch_b8ol
    user: merch
```

### Monitoring

**View Logs:**
Dashboard → merch-backend → Logs

**Database Metrics:**
Dashboard → merch-db → Metrics
- Connections
- Storage usage
- Queries per second

**Auto-Scaling:**
Render automatically scales based on traffic (Free tier: 1 instance)

---

## How It Works

### Signature-Based Minting Flow

```
Step 1: User Request
User → Frontend: "I want to claim ABC123"

Step 2: Frontend → Backend
POST /api/verify-code
Body: { code: "ABC123", walletAddress: "0x742..." }
Headers: { X-API-KEY: "..." }

Step 3: Backend Processing
1. Validate API key
2. Check code exists in PostgreSQL
3. Verify code not already used
4. Generate ERC-721 metadata JSON
5. (If IPFS enabled) Upload metadata to Pinata
   → Returns: ipfs://bafkreixxx...
6. Generate ECDSA signature:
   - Message: keccak256(abi.encodePacked(to, eventId, tokenURI))
   - Sign with backend issuer private key
   - Returns: 0x1234567890abcdef... (65 bytes)
7. Mark code as "used" in database

Step 4: Backend → Frontend
Response: {
  eventId: "0xbe403e4027a15a35adb3557d86a1b80d7417f2a8865e987149b10d0036648363",
  tokenURI: "ipfs://bafkreiczcdvbn2oaxa53v64moqiaz7bjux73c6rkhpg3uy5ixla7r6hjbe",
  signature: "0x6cd0aafa7a0725ed3d2a4c22268f5da8e6b9318734327a93680c5a4e048e32d0...",
  is_valid: true
}

Step 5: Frontend → User
"Please sign transaction to mint your NFT"
User pays gas: ~$0.20 on Base Sepolia

Step 6: User → Contract
Call: merchManager.mintSBTWithAttestation(
  to: "0x742...",
  tokenURI: "ipfs://bafkreixxx...",
  eventId: "0xbe403e...",
  signature: "0x6cd0aa..."
)

Step 7: Contract Verification
1. Reconstruct message hash
2. Recover signer from signature using ecrecover
3. Verify signer == backendIssuer address
4. If valid → Mint NFT
5. If invalid → Revert transaction

Step 8: Success
NFT minted to user's wallet ✅
Metadata permanently on IPFS ✅
Backend paid $0 gas ✅
```

### Key Security Features

**Signature Verification:**
- Backend signs with private key
- Contract verifies with public key (address)
- Impossible to forge without private key
- Each signature is unique per claim

**Single-Use Codes:**
- Database marks code as "used" before returning signature
- Prevents duplicate claims
- Race condition protection

**API Key Protection:**
- All sensitive endpoints require X-API-KEY header
- Rate limiting: 100 requests per 15 minutes per IP
- Prevents abuse and unauthorized access

**Backend Issuer Isolation:**
- Backend wallet only for signatures
- Never holds funds
- Never sends transactions
- If compromised: only affects new mints (old ones still valid)

---

## Cost Analysis

### Traditional Admin Minting Model

**Admin mints NFT for user:**
- Backend pays gas: ~$0.02 per mint on Base Sepolia
- For 10,000 users: $200 backend cost
- Requires constant funding of admin wallet
- Limited by available funds

### Signature-Based Model (This Backend)

**Backend generates signature, user mints:**
- Backend pays: $0 (signatures are free computation)
- User pays gas: ~$0.20 per mint on Base Sepolia
- For 10,000 users: $0 backend cost
- Unlimited scalability

### Cost Comparison Table

| Metric | Admin Minting | Signature-Based |
|--------|---------------|-----------------|
| Backend gas cost | $0.02/user | $0/user |
| User gas cost | $0 | ~$0.20 |
| Backend wallet funding | Required | Not required |
| Scalability | Limited by funds | Unlimited |
| Backend operational cost | $200/10k users | $0/10k users |
| Infrastructure cost | Render Free Tier | Render Free Tier |
| Total cost (10k users) | $200 | $0 |

### Infrastructure Costs (Render Free Tier)

**Included free:**
- Web Service: 750 hours/month
- PostgreSQL: 1GB storage, 90 days
- Bandwidth: 100GB/month
- SSL/HTTPS: Automatic
- Deployments: Unlimited

**After free tier:**
- Web Service: $7/month (Starter)
- PostgreSQL: $7/month (1GB, persistent)
- Or migrate to another service (Supabase, Railway, etc.)

### IPFS Costs (Pinata Free Tier)

**Included free:**
- 1GB storage
- Unlimited bandwidth
- 100 requests/second

**After free tier:**
- $20/month for 10GB + more features
- Or use other providers (Fleek, NFT.Storage, etc.)

---

## Security

### Authentication & Authorization

**API Key Authentication:**
- All POST endpoints require X-API-KEY header
- Key stored in environment variables (never in code)
- Different keys for dev/staging/production
- Rotate keys periodically

**Rate Limiting:**
- 100 requests per 15 minutes per IP
- Prevents brute force attacks
- Configurable in server.js

**CORS Configuration:**
- Configured for MiniApp domains
- Prevents unauthorized origins
- Can whitelist specific domains

### Data Security

**PostgreSQL Security:**
- Connection string in environment variables
- Prepared statements (prevents SQL injection)
- Connection pooling
- SSL/TLS encryption (Render default)

**Private Key Management:**
- Backend issuer private key in environment variables
- Never logged or exposed
- Wallet needs zero funds (signatures only)
- Rotation: generate new key, update contract

**Input Validation:**
- All inputs sanitized
- Address validation (ethers.isAddress)
- Code format validation
- Type checking with TypeScript (recommended)

### Smart Contract Security

**Signature Verification:**
- Uses ecrecover for signature validation
- Prevents signature forgery
- Single-use enforcement in backend

**Access Control:**
- Only verified signatures can mint
- Backend issuer address hardcoded in contract
- Cannot be changed without redeployment

### Infrastructure Security

**Render Security:**
- HTTPS enforced
- Environment variables encrypted
- Automatic security updates
- DDoS protection

**Helmet Security Headers:**
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### Security Best Practices

**Do:**
- Use environment variables for secrets
- Rotate API keys regularly
- Monitor logs for suspicious activity
- Keep dependencies updated
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs

**Don't:**
- Commit .env files to git
- Share API keys publicly
- Log sensitive data
- Use default/weak keys
- Expose private keys
- Allow unlimited requests
- Trust user input without validation

---

## Available Claim Codes

### Sample Codes (for testing)

These codes are added via `/api/admin/add-sample-claims`:

| Code | Event | Status |
|------|-------|--------|
| TEST123 | Web3 Summit 2025 | Used ✅ |
| DEMO456 | NFT NYC 2025 | Available |
| SAMPLE789 | ETH Denver 2025 | Available |
| DEVTEST001 | Web3 Summit 2025 | Available |
| ALPHA001 | NFT NYC 2025 | Available |
| BETA002 | ETH Denver 2025 | Available |
| GAMMA003 | Web3 Summit 2025 | Available |
| DELTA004 | NFT NYC 2025 | Available |
| EPSILON005 | ETH Denver 2025 | Available |
| ZETA006 | Web3 Summit 2025 | Available |

### Add Custom Claims

**Via API:**
```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/admin/add-claim \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "code": "CUSTOM001",
    "eventId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "tokenURI": "http://localhost:3000/api/token-metadata/100",
    "eventName": "My Custom Event 2025"
  }'
```

**Via Direct Database:**
```sql
-- Connect to PostgreSQL
psql -h dpg-xxx.oregon-postgres.render.com -U merch merch_b8ol

-- Insert claim
INSERT INTO claims (code, event_id, token_uri, used, created_at)
VALUES (
  'CUSTOM001',
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  'http://localhost:3000/api/token-metadata/100',
  false,
  NOW()
);
```

### View Claims Status

```bash
# List all claims
curl https://merch-backend-ot7l.onrender.com/api/admin/list-claims \
  -H "X-API-KEY: your-api-key"

# Via PostgreSQL
psql -h dpg-xxx.oregon-postgres.render.com -U merch merch_b8ol

SELECT code, used, used_by, used_at FROM claims ORDER BY created_at DESC;
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Refused

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Verify DATABASE_URL is set correctly
- Should point to Render PostgreSQL, not localhost
- Correct format: `postgresql://merch:pass@dpg-xxx.oregon-postgres.render.com/merch_b8ol`

#### 2. Pinata Upload Failed

**Error:**
```
❌ Pinata upload failed: This API endpoint requires valid JSON
```

**Solution:**
- Verify PINATA_JWT is correct
- Check JWT hasn't expired
- Get new JWT from: https://app.pinata.cloud/keys
- Ensure METADATA_STORAGE_TYPE=ipfs

#### 3. Trust Proxy Error

**Error:**
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

**Solution:**
Add to server.js after `const app = express();`:
```javascript
app.set('trust proxy', 1);
```

#### 4. API Key Unauthorized

**Error:**
```json
{"error": "Unauthorized"}
```

**Solution:**
- Verify X-API-KEY header is set
- Check API_KEY environment variable
- Ensure no extra spaces or newlines
- Case-sensitive comparison

#### 5. Claim Code Already Used

**Error:**
```json
{"error": "Claim code already used"}
```

**Solution:**
- Code can only be used once (by design)
- Use a different code
- Or reset in database for testing:
```sql
UPDATE claims SET used = false, used_by = NULL, used_at = NULL WHERE code = 'TEST123';
```

#### 6. Contract Call Reverted

**Error in frontend:**
```
Contract call reverted: Invalid signature
```

**Solution:**
- Verify backend issuer address matches contract
- Check signature generation is correct
- Ensure contract is deployed on Base Sepolia
- Verify contract address in environment variables

### Debug Mode

**Enable verbose logging:**

```javascript
// In server.js, add:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    headers: req.headers
  });
  next();
});
```

### Health Checks

**Backend health:**
```bash
curl https://merch-backend-ot7l.onrender.com/health
```

**Database health:**
```bash
psql -h dpg-xxx.oregon-postgres.render.com -U merch merch_b8ol -c "SELECT 1;"
```

**Pinata health:**
```bash
npm run test:pinata
```

### Logs

**Render logs:**
Dashboard → merch-backend → Logs (real-time)

**PostgreSQL logs:**
Dashboard → merch-db → Logs

**Local logs:**
```bash
npm run dev  # Watch console output
```

---

## Additional Resources

### Official Documentation

**Base:**
- Base Docs: https://docs.base.org
- Base Sepolia Explorer: https://sepolia.basescan.org
- Base Faucet: https://faucet.quicknode.com/base/sepolia

**MiniApp:**
- MiniApp Docs: https://docs.base.org/miniapp
- MiniKit SDK: https://github.com/farcasterxyz/miniapp-sdk
- Base Build: https://build.base.org

**Web3 Libraries:**
- Wagmi: https://wagmi.sh
- Viem: https://viem.sh
- Ethers.js: https://docs.ethers.org

**Infrastructure:**
- Render: https://render.com/docs
- Pinata: https://docs.pinata.cloud
- PostgreSQL: https://www.postgresql.org/docs

### Community & Support

**Base:**
- Discord: https://discord.gg/buildonbase
- Twitter: https://twitter.com/buildonbase
- GitHub: https://github.com/base-org

**Farcaster:**
- Warpcast: https://warpcast.com
- Docs: https://docs.farcaster.xyz

### Related Projects

**EAS (Ethereum Attestation Service):**
- Website: https://attest.sh
- Docs: https://docs.attest.sh
- Base Sepolia: 0x4200000000000000000000000000000000000021

**OpenZeppelin:**
- Contracts: https://docs.openzeppelin.com/contracts
- ERC-721: https://docs.openzeppelin.com/contracts/erc721

### Example Repositories

**This project:**
- Backend: https://github.com/your-username/merch-backend
- Frontend: https://github.com/your-username/merch-frontend

**Base Examples:**
- Base Examples: https://github.com/base-org/base-examples
- MiniApp Examples: https://github.com/farcasterxyz/miniapp-examples

---

## License

MIT License


---

## Appendix

### A. Complete Environment Variables Reference

```bash
# ====== SERVER CONFIGURATION ======
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# ====== SECURITY ======
BACKEND_ISSUER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
API_KEY=...

# ====== BLOCKCHAIN CONFIGURATION ======
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASIC_MERCH_ADDRESS=0x5eEC061B0A4d5d2Be4aCF831DE73E27e39F442fF
MERCH_MANAGER_ADDRESS=0x900DB725439Cf512c2647d2B1d327dc9d1D85a6C
PREMIUM_MERCH_ADDRESS=0xd668020ed16f83B5E0f7E772D843A51972Dd25A9
EAS_INTEGRATION_ADDRESS=0x07446D2465E8390025dda9a53Dd3d43E6BA75eC6

# ====== DATABASE CONFIGURATION ======
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/database

# ====== METADATA STORAGE ======
METADATA_STORAGE_TYPE=ipfs
PINATA_JWT=your_pinata_jwt_here
```

### B. PostgreSQL Schema

```sql
-- Claims table
CREATE TABLE claims (
  code VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(66) NOT NULL,
  token_uri TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_by VARCHAR(42),
  used_at TIMESTAMP,
  reserved_by VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
  reservation_id VARCHAR(66) PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  user_identifier VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  event_id VARCHAR(66) NOT NULL,
  token_uri TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (code) REFERENCES claims(code)
);

-- Token metadata table
CREATE TABLE token_metadata (
  token_id SERIAL PRIMARY KEY,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_claims_used ON claims(used);
CREATE INDEX idx_claims_event_id ON claims(event_id);
CREATE INDEX idx_reservations_code ON reservations(code);
CREATE INDEX idx_reservations_user ON reservations(user_identifier);
```

### C. Contract ABI Reference

**MerchManager.mintSBTWithAttestation:**
```solidity
function mintSBTWithAttestation(
    address to,
    string memory tokenURI,
    bytes32 eventId,
    bytes memory signature
) external returns (uint256)
```

**Signature Message Format:**
```solidity
bytes32 messageHash = keccak256(
    abi.encodePacked(to, eventId, tokenURI)
);
```

**Signature Verification:**
```solidity
address signer = ECDSA.recover(
    ECDSA.toEthSignedMessageHash(messageHash),
    signature
);
require(signer == backendIssuer, "Invalid signature");
```

### D. API Response Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid input or claim already used |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not Found | Claim code doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### E. Rate Limiting Details

**Configuration:**
- Window: 15 minutes
- Max requests: 100 per IP
- Applies to: All /api/* endpoints
- Reset: Rolling window

**Headers returned:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635000000
```

---

## Contact & Maintainers

**Project:** Merch MVP Backend  
**Built for:** Base Bootcamp  
**Date:** October 2025  

**Backend API:** https://merch-backend-ot7l.onrender.com  
**Backend Issuer:** 0x648a3e5510f55B4995fA5A22cCD62e2586ACb901  
**Chain:** Base Sepolia (Chain ID: 84532)  

---

**End of Documentation**
