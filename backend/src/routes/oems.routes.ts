import { Router } from 'express';
import { getOEMs, getOEMById, getOEMProductLines, getProductLineModels } from '../controllers/oems.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All OEM routes require authentication
router.use(authenticate);

// OEM routes
router.get('/', getOEMs);
router.get('/:id', getOEMById);
router.get('/:id/product-lines', getOEMProductLines);

// Product line routes (nested under OEMs conceptually)
router.get('/product-lines/:id/models', getProductLineModels);

export default router;
