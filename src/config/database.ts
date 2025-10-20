import mongoose from 'mongoose';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export let redisClient: ReturnType<typeof createClient>;

export async function connectDatabase() {
  try {
    // MongoDB connection
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('✅ MongoDB connected');
    }
    
    // Redis connection (opcional)
    if (process.env.REDIS_URL) {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      redisClient.on('error', (err) => logger.error('Redis Client Error', err));
      
      try {
        await redisClient.connect();
        logger.info('✅ Redis connected');
      } catch (error) {
        logger.warn('⚠️ Redis not available, continuing without cache');
      }
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}