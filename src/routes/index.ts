import { Application } from 'express';

export function setupRoutes(app: Application) {
  // Health check básico
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    });
  });
}