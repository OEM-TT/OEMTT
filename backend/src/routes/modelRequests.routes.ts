import { Router } from 'express';
import {
  getModelRequests,
  getModelRequestStats,
  updateModelRequest,
  deleteModelRequest,
} from '../controllers/modelRequests.controller';

const router = Router();

// Public routes for dashboard (no auth required)
router.get('/', getModelRequests);
router.get('/stats', getModelRequestStats);
router.patch('/:id', updateModelRequest);
router.delete('/:id', deleteModelRequest);

export default router;
