// scripts/generate-bulk-claims.js
// Generate bulk claim codes for testing

require('dotenv').config();
const { ethers } = require('ethers');
const db = require('../database/db');
const MetadataService = require('../services/metadata-service');

// Configuration
const TOTAL_CODES = 300; // Change this number
const BATCH_SIZE = 50;   // Process in batches to avoid memory issues

// Event templates
const EVENTS = [
  { name: 'Web3 Summit 2025', location: 'Lisbon' },
  { name: 'NFT NYC 2025', location: 'New York' },
  { name: 'ETH Denver 2025', location: 'Denver' },
  { name: 'Token2049 Singapore', location: 'Singapore' },
  { name: 'Consensus Austin', location: 'Austin' },
  { name: 'EthCC Paris', location: 'Paris' },
  { name: 'DevCon Bangkok', location: 'Bangkok' },
  { name: 'Base Camp Miami', location: 'Miami' },
  { name: 'Blockchain Week NYC', location: 'New York' },
  { name: 'Web3 Conference Dubai', location: 'Dubai' }
];

// Code prefixes for organization
const PREFIXES = ['BASE', 'MERCH', 'EVENT', 'CLAIM', 'NFT', 'TEST', 'DEMO', 'ALPHA', 'BETA', 'VIP'];

/**
 * Generate a unique claim code
 */
function generateCode(index) {
  const prefix = PREFIXES[index % PREFIXES.length];
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const numberPart = String(index).padStart(4, '0');
  
  return `${prefix}-${randomPart}-${numberPart}`;
}

/**
 * Generate bulk claims
 */
async function generateBulkClaims() {
  console.log('🚀 Bulk Claim Code Generator');
  console.log('='.repeat(50));
  console.log(`📊 Total codes to generate: ${TOTAL_CODES}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log('='.repeat(50));
  console.log('');

  const metadataService = new MetadataService(process.env.METADATA_STORAGE_TYPE || 'local');
  
  let totalCreated = 0;
  let totalFailed = 0;

  // Process in batches
  for (let batchStart = 0; batchStart < TOTAL_CODES; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_CODES);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(TOTAL_CODES / BATCH_SIZE);

    console.log(`\n📦 Processing Batch ${batchNum}/${totalBatches} (codes ${batchStart + 1}-${batchEnd})`);
    console.log('-'.repeat(50));

    for (let i = batchStart; i < batchEnd; i++) {
      try {
        // Generate unique code
        const code = generateCode(i);
        
        // Select event (cycle through events)
        const event = EVENTS[i % EVENTS.length];
        
        // Generate random event ID
        const eventId = ethers.hexlify(ethers.randomBytes(32));
        
        // Generate token URI
        const tokenURI = `${process.env.BASE_URL || 'http://localhost:3000'}/api/token-metadata/${i + 1}`;
        
        // Generate metadata
        const metadata = metadataService.generateSBTMetadata(
          i + 1,
          `${event.name} - ${event.location}`,
          '0x0000000000000000000000000000000000000000',
          Math.floor(Date.now() / 1000)
        );

        // Create claim in database
        await db.createClaim({
          code,
          eventId,
          tokenURI,
          metadata
        });

        totalCreated++;
        
        // Progress indicator (every 10 codes)
        if ((i + 1) % 10 === 0) {
          process.stdout.write('✅ ');
        }

      } catch (error) {
        totalFailed++;
        
        // Only log if not a duplicate error
        if (error.code !== '23505') {
          console.error(`\n❌ Error on code ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n');
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Successfully created: ${totalCreated} codes`);
  console.log(`❌ Failed/Skipped: ${totalFailed} codes`);
  console.log(`📈 Success rate: ${((totalCreated / TOTAL_CODES) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  console.log('');
  
  // Show sample codes
  console.log('📋 Sample generated codes:');
  console.log('   BASE-A1B2C3-0000');
  console.log('   MERCH-X9Y8Z7-0001');
  console.log('   EVENT-P5Q4R3-0002');
  console.log('   ... (and more)');
  console.log('');
  
  process.exit(0);
}

// Run
(async () => {
  try {
    await generateBulkClaims();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();