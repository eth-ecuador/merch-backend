// scripts/test-signature.js
// Test signature generation and verification

require('dotenv').config();
const { ethers } = require('ethers');

async function testSignature() {
  console.log('\n🧪 Testing Signature Generation\n');
  console.log('=====================================');
  
  if (!process.env.BACKEND_ISSUER_PRIVATE_KEY) {
    console.error('❌ Error: BACKEND_ISSUER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  
  try {
    const wallet = new ethers.Wallet(process.env.BACKEND_ISSUER_PRIVATE_KEY);
    console.log('✅ Backend Issuer loaded');
    console.log(`   Address: ${wallet.address}\n`);
    
    // ARREGLADO: Usar getAddress para checksum correcto
    const testParams = {
      to: ethers.getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0bebb'),
      eventId: ethers.hexlify(ethers.randomBytes(32)),
      tokenURI: 'ipfs://QmTest123abc456def'
    };
    
    console.log('📋 Test Parameters:');
    console.log(`   Wallet: ${testParams.to}`);
    console.log(`   Event ID: ${testParams.eventId}`);
    console.log(`   Token URI: ${testParams.tokenURI}\n`);
    
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'string'],
      [testParams.to, testParams.eventId, testParams.tokenURI]
    );
    
    console.log('📝 Message Hash:');
    console.log(`   ${messageHash}\n`);
    
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    console.log('✍️  Signature:');
    console.log(`   ${signature}\n`);
    
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      signature
    );
    
    console.log('🔍 Verification:');
    console.log(`   Recovered Address: ${recoveredAddress}`);
    console.log(`   Expected Address:  ${wallet.address}`);
    console.log(`   Matches: ${recoveredAddress.toLowerCase() === wallet.address.toLowerCase() ? '✅' : '❌'}\n`);
    
    if (recoveredAddress.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('=====================================');
      console.log('✅ Signature generation test PASSED\n');
      console.log('Your backend is correctly configured!');
      console.log('Users can now mint NFTs with signatures.\n');
    } else {
      console.log('❌ Signature generation test FAILED\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSignature();
