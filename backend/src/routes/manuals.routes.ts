import { Router } from 'express';
import { getManualById, getManualSections, searchManualSections } from '../controllers/manuals.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All manual routes require authentication
router.use(authenticate);

// Manual routes
router.get('/search-sections', searchManualSections);
router.get('/:id', getManualById);
router.get('/:id/sections', getManualSections);

export default router;
