import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const healthController = new HealthController(); 

// GET /health - Health check
router.get(
  '/health',
  asyncHandler(healthController.check.bind(healthController))
);

export { router as healthRoutes };