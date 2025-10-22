// routes/attestations.js
// EAS (Ethereum Attestation Service) integration

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// ==============================================
// MIDDLEWARE
// ==============================================

const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ==============================================
// ENDPOINTS
// ==============================================

/**
 * @route   POST /api/attest-claim
 * @desc    Create an on-chain attestation after successful claim
 * @access  Protected (requires API key)
 */
router.post('/attest-claim', requireApiKey, async (req, res) => {
  try {
    const { eventId, attendeeAddress, txHash } = req.body;
    
    // Validate input
    if (!eventId || !attendeeAddress || !txHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, attendeeAddress, txHash' 
      });
    }
    
    // Validate addresses
    if (!ethers.isAddress(attendeeAddress)) {
      return res.status(400).json({ 
        error: 'Invalid attendee address format' 
      });
    }
    
    console.log('📝 Creating attestation:');
    console.log('   Event ID:', eventId);
    console.log('   Attendee:', attendeeAddress);
    console.log('   Mint TX:', txHash);
    
    // Get transaction receipt to extract token ID
    const provider = global.provider;
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return res.status(404).json({ 
        error: 'Transaction not found or not yet confirmed' 
      });
    }
    
    if (!receipt.status) {
      return res.status(400).json({ 
        error: 'Transaction failed' 
      });
    }
    
    // Parse logs to find token ID from Transfer event
    // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferEventTopic = ethers.id('Transfer(address,address,uint256)');
    const transferLog = receipt.logs.find(log => log.topics[0] === transferEventTopic);
    
    if (!transferLog) {
      return res.status(400).json({ 
        error: 'Could not find Transfer event in transaction' 
      });
    }
    
    // Decode token ID from log
    const tokenId = ethers.toBigInt(transferLog.topics[3]);
    
    console.log('   Token ID:', tokenId.toString());
    
    // Create attestation on-chain
    const easContract = global.easContract;
    
    const attestTx = await easContract.createAttendanceAttestation(
      eventId,
      attendeeAddress,
      tokenId,
      false // isPremiumUpgrade
    );
    
    console.log('   Attestation TX sent:', attestTx.hash);
    
    // Wait for confirmation
    const attestReceipt = await attestTx.wait();
    
    console.log('✅ Attestation created successfully');
    console.log('   TX Hash:', attestReceipt.hash);
    console.log('   Block:', attestReceipt.blockNumber);
    
    return res.json({
      success: true,
      attestationTxHash: attestReceipt.hash,
      blockNumber: attestReceipt.blockNumber,
      tokenId: tokenId.toString(),
      message: 'Attestation created on-chain'
    });
    
  } catch (error) {
    console.error('❌ Error creating attestation:', error);
    return res.status(500).json({ 
      error: 'Failed to create attestation',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/user-attestations/:address
 * @desc    Get all attestations for a user address
 * @access  Public
 */
router.get('/user-attestations/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ 
        error: 'Invalid address format' 
      });
    }
    
    // Query attestations from contract
    // Note: This requires the contract to have a getter function
    // For now, we'll return a placeholder
    
    console.log('📋 Querying attestations for:', address);
    
    // TODO: Implement actual query from EAS contract or indexer
    
    return res.json({
      address,
      attestations: [],
      message: 'Attestation querying not yet implemented. Use EAS GraphQL API.'
    });
    
  } catch (error) {
    console.error('❌ Error querying attestations:', error);
    return res.status(500).json({ 
      error: 'Failed to query attestations' 
    });
  }
});

module.exports = router;