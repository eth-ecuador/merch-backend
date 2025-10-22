// scripts/add-sample-claims.js
// Add sample claim codes to database for testing

require('dotenv').config();
const db = require('../database/db');
const { ethers } = require('ethers');

const SAMPLE_EVENTS = [
  {
    name: 'Web3 Summit 2025',
    eventId: ethers.hexlify(ethers.randomBytes(32))
  },
  {
    name: 'NFT NYC 2025',
    eventId: ethers.hexlify(ethers.randomBytes(32))
  },
  {
    name: 'ETH Denver 2025',
    eventId: ethers.hexlify(ethers.randomBytes(32))
  }
];

const SAMPLE_CODES = [
  'TEST123',
  'DEMO456',
  'SAMPLE789',
  'DEVTEST001',
  'ALPHA001',
  'BETA002',
  'GAMMA003',
  'DELTA004',
  'EPSILON005',
  'ZETA006'
];

async function addSampleClaims() {
  console.log('\n🎫 Adding sample claim codes...\n');
  
  try {
    let count = 0;
    
    for (const code of SAMPLE_CODES) {
      const event = SAMPLE_EVENTS[count % SAMPLE_EVENTS.length];
      
      const tokenURI = `${process.env.BASE_URL || 'http://localhost:3000'}/api/token-metadata/${count + 1}`;
      
      await db.createClaim({
        code,
        eventId: event.eventId,
        tokenURI,
        metadata: {
          name: `${event.name} - Attendance Proof #${count + 1}`,
          description: `Sample claim for ${event.name}`,
          attributes: []
        }
      });
      
      console.log(`✅ Added: ${code} → ${event.name}`);
      count++;
    }
    
    console.log(`\n✅ Successfully added ${count} sample claims`);
    console.log('\n📋 Sample codes you can use for testing:');
    SAMPLE_CODES.forEach(code => console.log(`   ${code}`));
    console.log('');
    
  } catch (error) {
    console.error('❌ Error adding sample claims:', error);
    process.exit(1);
  }
}

addSampleClaims();