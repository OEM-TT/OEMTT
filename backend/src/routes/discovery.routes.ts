/**
 * Discovery Routes
 * On-demand manual discovery and ingestion
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  discoverManual,
  searchWithDiscovery,
  getDiscoveryStatus,
} from '@/controllers/discovery.controller';

const router = Router();

/**
 * POST /api/discovery/manual
 * Discover and ingest a manual on-demand
 * 
 * Body: { oem: string, modelNumber: string }
 * Response: { success: boolean, manual?: { id, title, pageCount, sectionsCreated } }
 */
router.post('/manual', authenticate, discoverManual);

/**
 * GET /api/discovery/search?oem=Carrier&model=19XR
 * Search database first, trigger discovery if not found
 * 
 * Response: { success: boolean, source: 'database' | 'discovery', manuals: [] }
 */
router.get('/search', authenticate, searchWithDiscovery);

/**
 * GET /api/discovery/status/:manualId
 * Get processing status of a discovered manual
 * 
 * Response: { id, status, title, sectionsProcessed, ... }
 */
router.get('/status/:manualId', authenticate, getDiscoveryStatus);

export default router;
