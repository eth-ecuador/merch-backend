import { Router } from 'express';
import { MetadataController } from '../controllers/metadata.controller';
import { validateApiKey } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const metadataController = new MetadataController();

// GET /token-metadata/:id - Get token metadata (NO AUTH REQUIRED)
router.get(
  '/token-metadata/:id',
  asyncHandler(metadataController.getTokenMetadata.bind(metadataController))
);

// POST /upload-metadata - Upload metadata to IPFS (REQUIRES AUTH)
router.post(
  '/upload-metadata',
  validateApiKey,
  asyncHandler(metadataController.uploadMetadata.bind(metadataController))
);

// POST /create-metadata - Create and upload metadata (REQUIRES AUTH)
router.post(
  '/create-metadata',
  validateApiKey,
  asyncHandler(metadataController.createMetadata.bind(metadataController))
);

export { router as metadataRoutes };