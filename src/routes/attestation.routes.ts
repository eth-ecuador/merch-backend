import { Router } from 'express';
import { AttestationController } from '../controllers/attestation.controller';
import { validateApiKey } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const attestationController = new AttestationController();

// POST /attest-claim - Create EAS attestation
router.post(
  '/attest-claim',
  validateApiKey,
  asyncHandler(attestationController.attestClaim.bind(attestationController))
);

// GET /attestations/:uid - Get attestation by UID
router.get(
  '/attestations/:uid',
  asyncHandler(attestationController.getAttestation.bind(attestationController))
);

// GET /attestations/wallet/:address - Get attestations by wallet
router.get(
  '/attestations/wallet/:address',
  asyncHandler(attestationController.getAttestationsByWallet.bind(attestationController))
);

export { router as attestationRoutes };