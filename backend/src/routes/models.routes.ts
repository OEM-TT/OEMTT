import { Router } from 'express';
import { searchModels, getModelById, getModelManuals } from '../controllers/models.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All model routes require authentication
router.use(authenticate);

// Model routes
router.get('/search', searchModels);
router.get('/:id', getModelById);
router.get('/:id/manuals', getModelManuals);

export default router;
