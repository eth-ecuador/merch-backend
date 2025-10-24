/**
 * Routes: Event Image Upload (IPFS via Pinata)
 * 
 * Endpoints:
 * - POST /api/events/upload-image (público - cualquier usuario puede subir)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

// ============ Configuration ============

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Multer configuration (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF allowed.'));
    }
  }
});

// ============ Upload to IPFS (Pinata) ============

async function uploadToPinata(buffer, filename, mimetype) {
  const PINATA_JWT = process.env.PINATA_JWT;
  
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured in environment variables');
  }
  
  try {
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: filename,
      contentType: mimetype
    });
    
    // Optional: Add metadata
    const pinataMetadata = JSON.stringify({
      name: filename,
      keyvalues: {
        type: 'event-image',
        uploadedAt: new Date().toISOString()
      }
    });
    
    formData.append('pinataMetadata', pinataMetadata);
    
    // Optional: Add options
    const pinataOptions = JSON.stringify({
      cidVersion: 1
    });
    
    formData.append('pinataOptions', pinataOptions);
    
    console.log('📤 Uploading to Pinata...');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pinata error:', errorText);
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Uploaded to IPFS:', data.IpfsHash);
    
    return {
      ipfsHash: data.IpfsHash,
      ipfsUrl: `ipfs://${data.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      size: data.PinSize,
      timestamp: data.Timestamp
    };
    
  } catch (error) {
    console.error('❌ Pinata upload error:', error);
    throw error;
  }
}

// ============ Routes ============

/**
 * POST /api/events/upload-image
 * Upload event image to IPFS
 * 
 * Body: multipart/form-data
 * - image: File (required, max 5MB)
 * - uploaderAddress: string (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "storage": "ipfs",
 *   "imageUri": "ipfs://QmXxxx...",
 *   "ipfsHash": "QmXxxx...",
 *   "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXxxx...",
 *   "size": 245678
 * }
 */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }
    
    const { buffer, mimetype, originalname, size } = req.file;
    const uploaderAddress = req.body.uploaderAddress || 'unknown';
    
    console.log('\n📸 Image Upload Request:');
    console.log('  File:', originalname);
    console.log('  Size:', Math.round(size / 1024), 'KB');
    console.log('  Type:', mimetype);
    console.log('  Uploader:', uploaderAddress);
    
    // Upload to IPFS via Pinata
    const result = await uploadToPinata(buffer, originalname, mimetype);
    
    console.log('✅ Upload successful!');
    console.log('  IPFS Hash:', result.ipfsHash);
    console.log('  Gateway URL:', result.gatewayUrl);
    console.log('');
    
    res.json({
      success: true,
      storage: 'ipfs',
      imageUri: result.ipfsUrl,
      ipfsHash: result.ipfsHash,
      gatewayUrl: result.gatewayUrl,
      size: result.size,
      timestamp: result.timestamp
    });
    
  } catch (error) {
    console.error('❌ Image upload error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Image upload failed',
      message: error.message
    });
  }
});

/**
 * GET /api/events/image/:hash
 * Redirect to IPFS gateway
 * 
 * Params:
 * - hash: IPFS hash
 * 
 * Response: Redirect to gateway URL
 */
router.get('/image/:hash', (req, res) => {
  const hash = req.params.hash;
  
  // Validate IPFS hash format (basic)
  if (!hash || hash.length < 46) {
    return res.status(400).json({ error: 'Invalid IPFS hash' });
  }
  
  // Redirect to Pinata gateway
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
  res.redirect(gatewayUrl);
});

/**
 * GET /api/events/health
 * Check if Pinata is configured
 */
router.get('/health', (req, res) => {
  const pinataConfigured = !!process.env.PINATA_JWT;
  
  res.json({
    status: 'ok',
    ipfsEnabled: true,
    pinataConfigured: pinataConfigured,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    allowedTypes: ALLOWED_TYPES
  });
});

module.exports = router;