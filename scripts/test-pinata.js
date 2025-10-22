// scripts/test-pinata.js
// Test Pinata connection and upload

require('dotenv').config();
const axios = require('axios');

console.log('\n🧪 Testing Pinata Connection & Upload\n');
console.log('=====================================');

// Check credentials
const jwt = process.env.PINATA_JWT;

if (!jwt) {
  console.error('❌ Error: PINATA_JWT not configured\n');
  console.log('Add to your .env file:');
  console.log('  PINATA_JWT=your-jwt-token\n');
  process.exit(1);
}

console.log('✅ JWT found in .env\n');

// Test 1: Authentication
async function testAuthentication() {
  console.log('📝 Test 1: Authentication');
  console.log('   Testing connection to Pinata API...');
  
  try {
    const response = await axios.get(
      'https://api.pinata.cloud/data/testAuthentication',
      {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      }
    );
    
    console.log('   ✅ Authentication successful!');
    console.log(`   Message: ${response.data.message}\n`);
    return true;
    
  } catch (error) {
    console.error('   ❌ Authentication failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}\n`);
    } else {
      console.error(`   Error: ${error.message}\n`);
    }
    return false;
  }
}

// Test 2: Upload JSON (Metadata)
async function testJSONUpload() {
  console.log('📝 Test 2: Upload JSON Metadata');
  console.log('   Uploading sample metadata to IPFS...');
  
  try {
    // Sample metadata (ERC-721 format)
    const metadata = {
      name: 'Test NFT - Pinata Connection',
      description: 'This is a test metadata upload to verify Pinata integration',
      image: 'ipfs://QmTest123',
      attributes: [
        {
          trait_type: 'Type',
          value: 'Test'
        },
        {
          trait_type: 'Status',
          value: 'Verification'
        },
        {
          display_type: 'date',
          trait_type: 'Created',
          value: Math.floor(Date.now() / 1000)
        }
      ],
      properties: {
        category: 'test',
        created_by: 'merch-mvp-backend'
      }
    };
    
    const body = {
      pinataContent: metadata,
      pinataMetadata: {
        name: 'Test Metadata - Merch MVP',
        keyvalues: {
          type: 'test',
          project: 'merch-mvp'
        }
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      }
    );
    
    const ipfsHash = response.data.IpfsHash;
    console.log('   ✅ Upload successful!');
    console.log(`   IPFS Hash: ${ipfsHash}`);
    console.log(`   IPFS URI: ipfs://${ipfsHash}`);
    console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${ipfsHash}\n`);
    
    return ipfsHash;
    
  } catch (error) {
    console.error('   ❌ Upload failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.error('\n   💡 JWT token expired or invalid - regenerate in Pinata dashboard');
      } else if (error.response.status === 403) {
        console.error('\n   💡 JWT token missing pinJSONToIPFS permission or free tier limit reached');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.log('');
    return null;
  }
}

// Test 3: Retrieve from Gateway
async function testGatewayAccess(ipfsHash) {
  if (!ipfsHash) {
    console.log('📝 Test 3: Gateway Access');
    console.log('   ⚠️  Skipped (no IPFS hash from previous test)\n');
    return;
  }
  
  console.log('📝 Test 3: Gateway Access');
  console.log('   Retrieving metadata from Pinata gateway...');
  
  try {
    const response = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      { timeout: 10000 }
    );
    
    console.log('   ✅ Metadata retrieved successfully!');
    console.log('   Content preview:');
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Description: ${response.data.description}`);
    console.log(`   Attributes: ${response.data.attributes.length} items\n`);
    
  } catch (error) {
    console.error('   ❌ Gateway access failed');
    console.error(`   Error: ${error.message}`);
    console.log('   Note: It may take a few seconds for content to propagate\n');
  }
}

// Test 4: List Pinned Items
async function testListPinned() {
  console.log('📝 Test 4: List Recent Pins');
  console.log('   Fetching your recent pins...');
  
  try {
    const response = await axios.get(
      'https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=5',
      {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      }
    );
    
    const pins = response.data.rows;
    
    if (pins.length === 0) {
      console.log('   ℹ️  No pins found yet (this is normal for new accounts)\n');
    } else {
      console.log(`   ✅ Found ${pins.length} recent pins:\n`);
      
      pins.forEach((pin, index) => {
        console.log(`   ${index + 1}. ${pin.metadata.name || 'Unnamed'}`);
        console.log(`      Hash: ${pin.ipfs_pin_hash}`);
        console.log(`      Size: ${(pin.size / 1024).toFixed(2)} KB`);
        console.log(`      Date: ${new Date(pin.date_pinned).toLocaleDateString()}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('   ❌ Failed to list pins');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}\n`);
    } else {
      console.error(`   Error: ${error.message}\n`);
    }
  }
}

// Run all tests
async function runTests() {
  try {
    const authSuccess = await testAuthentication();
    
    if (!authSuccess) {
      console.log('❌ Tests aborted due to authentication failure\n');
      process.exit(1);
    }
    
    const ipfsHash = await testJSONUpload();
    await testGatewayAccess(ipfsHash);
    await testListPinned();
    
    console.log('=====================================');
    
    if (ipfsHash) {
      console.log('✅ All tests completed successfully!\n');
      console.log('🎉 Pinata is fully configured and working!');
      console.log('You can now use IPFS metadata hosting in your backend.\n');
      
      console.log('Next steps:');
      console.log('1. Set METADATA_STORAGE_TYPE=ipfs in .env');
      console.log('2. Restart your backend: npm run dev');
      console.log('3. Metadata will be uploaded to IPFS automatically\n');
    } else {
      console.log('⚠️  Tests completed with errors\n');
      console.log('Authentication works, but upload failed.');
      console.log('Please check the error messages above.\n');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Execute
runTests();
