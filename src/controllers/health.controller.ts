import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/database';
import { provider } from '../utils/blockchain';

export class HealthController {
  /**
   * GET /health
   */
  async check(req: Request, res: Response) {
    const services: any = {
      database: 'disconnected',
      redis: 'disconnected',
      rpc: 'disconnected'
    };
    
    // Check MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        services.database = 'connected';
      }
    } catch (error) {
      services.database = 'error';
    }
    
    // Check Redis
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.ping();
        services.redis = 'connected';
      }
    } catch (error) {
      services.redis = 'error';
    }
    
    // Check RPC
    try {
      await provider.getBlockNumber();
      services.rpc = 'connected';
    } catch (error) {
      services.rpc = 'error';
    }
    
    const allHealthy = Object.values(services).every(status => status === 'connected');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services
    });
  }
}