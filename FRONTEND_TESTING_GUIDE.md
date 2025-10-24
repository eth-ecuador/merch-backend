# 🧪 FRONTEND TESTING GUIDE - Merch MVP v2.0

**Backend URL:** https://merch-backend-ot7l.onrender.com  
**API Key:** `c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127`  
**Contract:** `0xD71F654c7B9C15A54B2617262369fA219c15fe24` (MerchManager)  
**Chain:** Base Sepolia (84532)

---

## 📊 Current Production Stats

```bash
curl -s https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq
```

**Current State (Oct 24, 2025):**
- **Total Codes:** 330
- **Used:** 17 (5.15%)
- **Available:** 313
- **Events:** 310

---

## 🚀 Quick Start for Frontend Team

### 1. Get Available Codes

```bash
# Get first 10 available codes
curl -s "https://merch-backend-ot7l.onrender.com/api/admin/list-claims?limit=10&used=false" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq '.claims[].code'
```

**Output Example:**
```
"VIP-5OXBPR-0299"
"NEW470573"
"SAMPLE470573"
"VIP-ABC123-0001"
...
```

### 2. Test Code Verification

```bash
CODE="VIP-5OXBPR-0299"
WALLET="0x742D35cC6634c0532925a3B844BC9E7595F0beBB"

curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"$WALLET\"}" \
  | jq
```

**Success Response:**
```json
{
  "eventId": "0xd6eefbe7baee48fcda3f1bc76ef62fca5e5aa01f19d9e868a7eabca90e44098f",
  "tokenURI": "https://merch-backend-ot7l.onrender.com/api/token-metadata/300",
  "signature": "0x6cd0aafa7a0725ed3d2a4c22268f5da8e6b9318734327a93680c5a4e048e32d0...",
  "is_valid": true,
  "metadata": {
    "name": "Test Event VIP-5OXBPR - Attendance Proof #1",
    "image": "ipfs://QmT7AEL3xoyhWUijNhx8kzxBqz1m7SFWmvwsNVKw1gFWQM",
    "attributes": [...]
  }
}
```

### 3. Upload Image to IPFS

```bash
# Create test image
echo "Event Poster" > poster.jpg

# Upload to IPFS
curl -X POST https://merch-backend-ot7l.onrender.com/api/events/upload-image \
  -F "image=@poster.jpg" \
  -F "uploaderAddress=0x742D35cC6634c0532925a3B844BC9E7595F0beBB" \
  | jq

# Cleanup
rm poster.jpg
```

**Response:**
```json
{
  "success": true,
  "storage": "ipfs",
  "imageUri": "ipfs://bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "ipfsHash": "bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafkreicncjhogses6bxa5fr5znkizcdf7ykaa2b7d6vy3t6vqqstavvjdi",
  "size": 13,
  "timestamp": "2025-10-24T01:07:48.524Z"
}
```

---

## 🔄 Complete Frontend Flow

### Scenario: Create Event & Claim NFT

#### Step 1: Upload Event Image

```javascript
// frontend/lib/api.js
export async function uploadEventImage(imageFile, uploaderAddress) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('uploaderAddress', uploaderAddress);
  
  const response = await fetch(
    'https://merch-backend-ot7l.onrender.com/api/events/upload-image',
    { method: 'POST', body: formData }
  );
  
  if (!response.ok) {
    throw new Error('Image upload failed');
  }
  
  const { imageUri, gatewayUrl } = await response.json();
  return { imageUri, gatewayUrl };
}
```

#### Step 2: Create Event On-Chain

```javascript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function CreateEventForm() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Upload image first
    const { imageUri } = await uploadEventImage(
      selectedFile,
      address
    );
    
    console.log('Image uploaded:', imageUri);
    // imageUri = "ipfs://bafkreixxx..."
    
    // 2. Create event on-chain
    writeContract({
      address: '0xD71F654c7B9C15A54B2617262369fA219c15fe24',
      abi: merchManagerABI,
      functionName: 'createEvent',
      args: [
        eventName,        // "Base Bootcamp 2025"
        eventDescription, // "Final project showcase"
        imageUri,         // "ipfs://bafkreixxx..."
        100               // quantity of codes
      ]
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <input value={eventName} onChange={(e) => setEventName(e.target.value)} />
      <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
      <button disabled={isConfirming}>
        {isConfirming ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

#### Step 3: Backend Auto-Detects Event

**Backend automatically:**
1. Detects `EventCreated` event
2. Generates 100 codes
3. Stores in PostgreSQL

**No frontend action needed!**

You'll see in backend logs:
```
🎉 NUEVO EVENTO DETECTADO!
📋 Event: Base Bootcamp 2025
   Event ID: 0xabc123...
🎫 Generando 100 códigos...
✅ 100 códigos generados exitosamente
```

#### Step 4: User Claims NFT

```javascript
// hooks/useClaimNFT.js
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

export function useClaimNFT() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  
  const claim = async (code, walletAddress) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Verify code and get signature
      const response = await fetch(
        'https://merch-backend-ot7l.onrender.com/api/verify-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127'
          },
          body: JSON.stringify({ code, walletAddress })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Code verification failed');
      }
      
      const { eventId, tokenURI, signature, is_valid } = await response.json();
      
      if (!is_valid) {
        throw new Error('Invalid code');
      }
      
      console.log('✅ Code verified');
      console.log('Event ID:', eventId);
      console.log('Token URI:', tokenURI);
      console.log('Signature:', signature);
      
      // 2. Mint NFT on-chain
      writeContract({
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
      
      return { success: true };
      
    } catch (err) {
      console.error('Claim error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { claim, isLoading: isLoading || isConfirming, error, hash };
}

// Usage in component
function ClaimForm() {
  const [code, setCode] = useState('');
  const { address } = useAccount();
  const { claim, isLoading, error, hash } = useClaimNFT();
  
  const handleClaim = async (e) => {
    e.preventDefault();
    const result = await claim(code, address);
    
    if (result.success) {
      toast.success('NFT claimed successfully! 🎉');
    } else {
      toast.error(result.error);
    }
  };
  
  return (
    <form onSubmit={handleClaim}>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter claim code"
      />
      <button disabled={isLoading}>
        {isLoading ? 'Claiming...' : 'Claim NFT'}
      </button>
      {error && <p className="error">{error}</p>}
      {hash && <p>Transaction: {hash}</p>}
    </form>
  );
}
```

---

## 📋 Available Endpoints

### 1. Health Check

```bash
GET https://merch-backend-ot7l.onrender.com/health
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

### 2. Event Listener Health

```bash
GET https://merch-backend-ot7l.onrender.com/health/listener
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

### 3. Upload Image to IPFS

```bash
POST https://merch-backend-ot7l.onrender.com/api/events/upload-image
Content-Type: multipart/form-data

Form Data:
  - image: File
  - uploaderAddress: string
```

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('uploaderAddress', '0x...');

const response = await fetch(
  'https://merch-backend-ot7l.onrender.com/api/events/upload-image',
  { method: 'POST', body: formData }
);

const { imageUri, gatewayUrl } = await response.json();
```

### 4. Verify Code

```bash
POST https://merch-backend-ot7l.onrender.com/api/verify-code
Content-Type: application/json
X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127

Body:
{
  "code": "VIP-5OXBPR-0299",
  "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"
}
```

**Success Response:**
```json
{
  "eventId": "0xd6eefbe...",
  "tokenURI": "https://merch-backend-ot7l.onrender.com/api/token-metadata/300",
  "signature": "0x6cd0aafa...",
  "is_valid": true,
  "metadata": {...}
}
```

**Error - Code Already Used:**
```json
{
  "error": "Claim code already used",
  "is_valid": false,
  "usedBy": "0x6388681e6a22f8fc30e3150733795255d4250db1",
  "usedAt": "2025-10-23T18:18:16.563Z"
}
```

**Error - Code Not Found:**
```json
{
  "error": "Claim code not found",
  "is_valid": false
}
```

### 5. Get Statistics (Admin)

```bash
GET https://merch-backend-ot7l.onrender.com/api/admin/stats
X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
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

### 6. List Claims (Admin)

```bash
GET https://merch-backend-ot7l.onrender.com/api/admin/list-claims?limit=10&offset=0&used=false
X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
```

**Query Parameters:**
- `limit` (number, 1-100) - Results per page
- `offset` (number) - Pagination offset
- `used` (boolean) - Filter by usage
- `event_id` (string) - Filter by event
- `used_by` (string) - Filter by wallet

**Response:**
```json
{
  "success": true,
  "count": 10,
  "claims": [
    {
      "code": "VIP-5OXBPR-0299",
      "event_id": "0xd6eefbe...",
      "token_uri": "https://merch-backend-ot7l.onrender.com/api/token-metadata/300",
      "used": false,
      "used_by": null,
      "used_at": null,
      "created_at": "2025-10-23T16:14:31.201Z",
      "metadata": {...}
    }
  ],
  "total": 330,
  "limit": 10,
  "offset": 0
}
```

### 7. Events Summary (Admin)

```bash
GET https://merch-backend-ot7l.onrender.com/api/admin/events-summary
X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
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

### 8. Get Event Codes (Admin)

```bash
GET https://merch-backend-ot7l.onrender.com/api/admin/event/0xbe403e40.../codes
X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
```

**Response:**
```json
{
  "success": true,
  "event_id": "0xbe403e40...",
  "total": 10,
  "used": 4,
  "available": 6,
  "codes": [...]
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (Success)

```bash
# 1. Get an available code
CODE=$(curl -s "https://merch-backend-ot7l.onrender.com/api/admin/list-claims?limit=1&used=false" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq -r '.claims[0].code')

echo "Testing with code: $CODE"

# 2. Verify code (this marks it as used)
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"0x742D35cC6634c0532925a3B844BC9E7595F0beBB\"}" \
  | jq

# Expected: is_valid: true, signature returned
```

### Scenario 2: Code Already Used

```bash
# Try to use the same code twice
CODE="VIP-5OXBPR-0299"  # Use a code that's already used

curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  -d "{\"code\": \"$CODE\", \"walletAddress\": \"0x742D35cC6634c0532925a3B844BC9E7595F0beBB\"}" \
  | jq

# Expected: error: "Claim code already used"
```

### Scenario 3: Invalid Code

```bash
curl -X POST https://merch-backend-ot7l.onrender.com/api/verify-code \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  -d '{"code": "INVALID-CODE-123", "walletAddress": "0x742D35cC6634c0532925a3B844BC9E7595F0beBB"}' \
  | jq

# Expected: error: "Claim code not found"
```

### Scenario 4: Upload Image

```bash
# Create test image
echo "Test Event Poster" > test-poster.jpg

# Upload
curl -X POST https://merch-backend-ot7l.onrender.com/api/events/upload-image \
  -F "image=@test-poster.jpg" \
  -F "uploaderAddress=0x742D35cC6634c0532925a3B844BC9E7595F0beBB" \
  | jq

# Expected: success: true, imageUri: "ipfs://bafkreixxx..."

# Cleanup
rm test-poster.jpg
```

### Scenario 5: Create Event Flow

```bash
# 1. Upload image
IMAGE_RESPONSE=$(curl -s -X POST https://merch-backend-ot7l.onrender.com/api/events/upload-image \
  -F "image=@poster.jpg" \
  -F "uploaderAddress=0x742D35cC6634c0532925a3B844BC9E7595F0beBB")

IMAGE_URI=$(echo $IMAGE_RESPONSE | jq -r '.imageUri')
echo "Image URI: $IMAGE_URI"

# 2. Create event on-chain (use frontend or Hardhat)
# const tx = await contract.createEvent(name, desc, imageUri, 100);

# 3. Wait for backend to detect (5-10 seconds)
sleep 10

# 4. Check stats (should show +100 codes)
curl -s https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq

# Expected: total increased by 100
```

---

## 💡 Tips for Frontend Team

### 1. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BACKEND_URL=https://merch-backend-ot7l.onrender.com
NEXT_PUBLIC_API_KEY=c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127
NEXT_PUBLIC_MERCH_MANAGER_ADDRESS=0xD71F654c7B9C15A54B2617262369fA219c15fe24
NEXT_PUBLIC_CHAIN_ID=84532
```

### 2. API Client

```javascript
// lib/api.js
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export const api = {
  async verifyCode(code, walletAddress) {
    const response = await fetch(`${BACKEND_URL}/api/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ code, walletAddress })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }
    
    return response.json();
  },
  
  async uploadImage(file, uploaderAddress) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploaderAddress', uploaderAddress);
    
    const response = await fetch(`${BACKEND_URL}/api/events/upload-image`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Image upload failed');
    }
    
    return response.json();
  },
  
  async getStats() {
    const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
      headers: { 'X-API-KEY': API_KEY }
    });
    return response.json();
  },
  
  async getAvailableCodes(limit = 10) {
    const response = await fetch(
      `${BACKEND_URL}/api/admin/list-claims?limit=${limit}&used=false`,
      { headers: { 'X-API-KEY': API_KEY } }
    );
    const data = await response.json();
    return data.claims.map(c => c.code);
  }
};
```

### 3. React Query Hooks

```javascript
// hooks/useBackendStats.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useBackendStats() {
  return useQuery({
    queryKey: ['backend-stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 30000 // Refresh every 30s
  });
}

// Usage
function StatsDisplay() {
  const { data: stats, isLoading } = useBackendStats();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Total Codes: {stats.total}</p>
      <p>Available: {stats.available}</p>
      <p>Used: {stats.used} ({stats.percentage_used}%)</p>
    </div>
  );
}
```

### 4. Error Handling

```javascript
function ClaimForm() {
  const handleClaim = async (code, address) => {
    try {
      const result = await api.verifyCode(code, address);
      
      // Success - mint NFT
      const tx = await writeContract({...});
      await tx.wait();
      
      toast.success('NFT claimed! 🎉');
      
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('already used')) {
        toast.error('This code has already been claimed');
      } else if (error.message.includes('not found')) {
        toast.error('Invalid claim code');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    }
  };
}
```

### 5. Monitor Available Codes

```javascript
// Display warning when running low on codes
function CodeWarning() {
  const { data: stats } = useBackendStats();
  
  if (!stats || stats.available > 50) return null;
  
  return (
    <div className="warning">
      ⚠️ Only {stats.available} codes remaining
    </div>
  );
}
```

---

## 📊 Monitoring During Testing

### Dashboard Stats

```bash
# Quick check
curl -s https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127" \
  | jq '{total, used, available}'
```

### Event Listener Status

```bash
# Check if listener is running
curl -s https://merch-backend-ot7l.onrender.com/health/listener \
  | jq '{status, isListening, blockNumber}'
```

### Backend Health

```bash
# Overall health
curl -s https://merch-backend-ot7l.onrender.com/health \
  | jq '{status, features}'
```

---

## 🚨 Common Issues & Solutions

### Issue 1: API Key Unauthorized

**Error:** `{"error": "Unauthorized"}`

**Solution:**
```javascript
// Make sure API key is in headers
headers: {
  'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY
}
```

### Issue 2: Code Already Used

**Error:** `"Claim code already used"`

**Solution:**
- Use a different code
- Get fresh codes from `/api/admin/list-claims?used=false`

### Issue 3: CORS Error

**Error:** `Cross-Origin Request Blocked`

**Solution:**
- Backend has CORS enabled for all origins
- If issue persists, check browser console
- Verify URL is `https://merch-backend-ot7l.onrender.com`

### Issue 4: Image Upload Fails

**Error:** `"No image file provided"`

**Solution:**
```javascript
// Make sure FormData is correct
const formData = new FormData();
formData.append('image', fileInput.files[0]);  // ← Must be named 'image'
formData.append('uploaderAddress', address);
```

### Issue 5: Signature Verification Fails

**Error:** Contract reverts with "Invalid signature"

**Solution:**
- Verify backend issuer matches contract
- Check signature format
- Ensure parameters order: `[address, tokenURI, eventId, signature]`

---

## 📞 Support

**Backend Logs:** https://dashboard.render.com → merch-backend → Logs

**Health Checks:**
```bash
curl https://merch-backend-ot7l.onrender.com/health
curl https://merch-backend-ot7l.onrender.com/health/listener
```

**Stats:**
```bash
curl https://merch-backend-ot7l.onrender.com/api/admin/stats \
  -H "X-API-KEY: c8ad4b0e2f3ddffa1fa410079cb863e4839b8cc65d1147c1aa48ed8b73434127"
```

---

## ✅ Testing Checklist

- [ ] Backend health check passes
- [ ] Event listener is active
- [ ] Can upload image to IPFS
- [ ] Can get available codes
- [ ] Can verify code successfully
- [ ] Error handling works (invalid code, used code)
- [ ] Can create event on-chain
- [ ] Backend auto-generates codes
- [ ] Can claim NFT with signature
- [ ] Stats update correctly

---

**Happy Testing! 🎉**

**Backend Version:** v2.0  
**Last Updated:** October 24, 2025  
**Production URL:** https://merch-backend-ot7l.onrender.com
