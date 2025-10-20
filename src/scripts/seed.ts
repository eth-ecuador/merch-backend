import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Claim } from '../models/Claim';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('Connected to MongoDB');
    
    const eventName = 'Base Bootcamp 2025';
    const eventId = ethers.keccak256(ethers.toUtf8Bytes(eventName));
    const expiresAt = new Date('2025-12-31');
    
    await Claim.deleteMany({});
    logger.info('Cleared existing claims');
    
    const claims = [];
    for (let i = 0; i < 100; i++) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `BASEBOOT2025-${i.toString().padStart(3, '0')}-${random}`;
      
      claims.push({
        code,
        eventId,
        eventName,
        tokenURI: `ipfs://QmSampleHash/${i}`,
        status: 'available',
        expiresAt,
        createdAt: new Date()
      });
    }
    
    await Claim.insertMany(claims);
    
    logger.info(`✅ Created ${claims.length} sample claims`);
    logger.info(`Event ID: ${eventId}`);
    logger.info('Sample codes:');
    claims.slice(0, 5).forEach(claim => {
      logger.info(`  - ${claim.code}`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
