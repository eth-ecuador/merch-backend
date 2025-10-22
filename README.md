# Merch MVP Backend API

Backend service for signature-based NFT minting with IPFS metadata hosting via Pinata.

## 🎯 Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Test setup
npm run test
npm run test:pinata  # If using Pinata

# 4. Add sample data
npm run add-claims

# 5. Start server
npm run dev
```

Server runs on: **http://localhost:3000**

---

## 📁 Project Structure
```
merch-backend/
├── server.js                  # Main Express app
├── routes/                    # API endpoints
│   ├── claims.js             # Signature generation
│   ├── attestations.js       # EAS integration
│   └── metadata.js           # Token metadata
├── database/                  # Data layer
│   └── db.js                 # DB abstraction
├── services/                  # Business logic
│   └── metadata-service.js   # Metadata + IPFS
└── scripts/                   # Utilities
    ├── add-sample-claims.js
    ├── test-signature.js
    └── test-pinata.js
```

---

## 🔑 Key Features

- ✅ **Signature Generation** - ECDSA signatures for public minting
- ✅ **Claim Verification** - Secure single-use claim codes
- ✅ **Off-chain Reserves** - Email/wallet reservations
- ✅ **IPFS via Pinata** - Automatic metadata upload
- ✅ **EAS Attestations** - On-chain proof of attendance
- ✅ **PostgreSQL Support** - Production-ready database
- ✅ **Render Ready** - One-click deployment

---

## 📡 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/verify-code` | POST | Yes | Generate signature |
| `/api/claim-offchain` | POST | Yes | Off-chain claim |
| `/api/attest-claim` | POST | Yes | Create attestation |
| `/api/token-metadata/:id` | GET | No | Get metadata |

---

## 🔧 Environment Variables

### Required
```bash
BACKEND_ISSUER_PRIVATE_KEY=0x...  # Signature wallet (no funds needed)
API_KEY=...                       # API protection key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASIC_MERCH_ADDRESS=0x...         # Your deployed contract
MERCH_MANAGER_ADDRESS=0x...       # Your deployed contract
```

### Optional - Pinata IPFS
```bash
METADATA_STORAGE_TYPE=ipfs
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get JWT at: **https://pinata.cloud** (free 1GB)

---

## 🧪 Testing
```bash
# Test signature generation
npm run test

# Test Pinata connection (if configured)
npm run test:pinata

# Add sample claims for testing
npm run add-claims

# Test API endpoints
curl http://localhost:3000/health
```

---

## 📖 Full Documentation

- **[Complete Installation Guide](./docs/INSTALL_GUIDE.md)** - Step-by-step setup
- **[Render Deployment](./render.yaml)** - Production deploy config

---

## 🚀 Deploy to Render
```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. Connect to Render
# https://dashboard.render.com
# New → Blueprint → Select repo

# 3. Add secret env vars:
# - BACKEND_ISSUER_PRIVATE_KEY
# - API_KEY
# - PINATA_JWT (if using IPFS)

# 4. Deploy!
```

Render auto-detects `render.yaml` and configures everything.

---

## 🎯 Usage Example

### Frontend integration:
```javascript
// 1. User requests claim
const response = await fetch('https://api.merch.app/api/verify-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': 'your-api-key'
  },
  body: JSON.stringify({
    code: 'ABC123',
    walletAddress: userAddress
  })
});

const { eventId, tokenURI, signature } = await response.json();

// 2. User mints with signature
const tx = await merchManager.mintSBTWithAttestation(
  userAddress,
  tokenURI,  // ipfs://Qm... if Pinata enabled
  eventId,
  signature
);
```

---

## 💡 How It Works
```
User → Frontend: "Claim ABC123"
  ↓
Frontend → Backend: POST /verify-code
  ↓
Backend: 
  1. Validates claim code
  2. (If Pinata) Uploads metadata to IPFS
  3. Generates ECDSA signature
  ↓
Frontend ← Backend: {signature, tokenURI, eventId}
  ↓
User signs transaction (pays gas)
  ↓
Contract verifies signature & mints ✅
```

**Key benefit:** Backend pays $0 (signatures are free), user pays own gas

---

## 📊 Cost Comparison

| Model | Backend Cost | User Cost | Scalability |
|-------|--------------|-----------|-------------|
| Old (Admin mints) | $0.02/user | $0 | Limited |
| New (Signature-based) | **$0** | ~$0.20 on Base | ✅ Unlimited |

**For 10,000 users:**
- Old model: $200 backend cost
- New model: **$0 backend cost**

---

## 🔐 Security

- ✅ API key authentication on POST endpoints
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation
- ✅ Backend issuer wallet needs no funds

---

## 📄 License

MIT

---

## 🤝 Support

- 📖 See [Installation Guide](./docs/INSTALL_GUIDE.md)
- 🐛 Open an issue on GitHub
- 💬 Check troubleshooting section

---

**Built with ❤️ for Base Bootcamp**