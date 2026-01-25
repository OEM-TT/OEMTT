/**
 * Ingestion Routes
 * 
 * Routes for processing PDF manuals and generating embeddings.
 * These are admin/dev endpoints for on-demand processing.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as ingestionController from '@/controllers/ingestion.controller';

const router = Router();

// List all manuals with processing status
router.get('/manuals', authenticate, ingestionController.listManuals);

// Get processing status for a manual
router.get('/status/:manualId', authenticate, ingestionController.getProcessingStatus);

// Process a manual (extract, chunk, embed, store)
router.post('/process/:manualId', authenticate, ingestionController.processManual);

export default router;
