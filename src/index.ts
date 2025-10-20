import express from 'express';
import dotenv from 'dotenv';
import { setupMiddlewares } from './middlewares';
import { setupRoutes } from './routes';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Setup middlewares
    setupMiddlewares(app);
    
    // Setup routes
    setupRoutes(app);
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Network: Base Sepolia (Chain ID: ${process.env.CHAIN_ID})`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();
