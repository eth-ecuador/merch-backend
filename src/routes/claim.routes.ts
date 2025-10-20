import { Router } from 'express';
import { ClaimController } from '../controllers/claim.controller';
import { validateApiKey } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const claimController = new ClaimController();

// POST /verify-code - Verify claim code
router.post(
  '/verify-code',
  validateApiKey,
  asyncHandler(claimController.verifyCode.bind(claimController))
);

// POST /claim-offchain - Reserve claim off-chain
router.post(
  '/claim-offchain',
  validateApiKey,
  asyncHandler(claimController.claimOffchain.bind(claimController))
);

export { router as claimRoutes };
