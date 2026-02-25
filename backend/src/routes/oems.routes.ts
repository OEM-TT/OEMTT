import { Router } from 'express';
import { 
  getOEMs, 
  getOEMById, 
  getOEMProductLines, 
  getProductLineModels,
  getOEMCategories,
  getCategorySubCategories,
  getSubCategoryProductLines,
} from '../controllers/oems.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All OEM routes require authentication
router.use(authenticate);

// OEM routes
router.get('/', getOEMs);
router.get('/:id', getOEMById);
router.get('/:id/product-lines', getOEMProductLines);
router.get('/:id/categories', getOEMCategories);

// Category routes
router.get('/categories/:id/sub-categories', getCategorySubCategories);

// Sub-category routes
router.get('/sub-categories/:id/product-lines', getSubCategoryProductLines);

// Product line routes (nested under OEMs conceptually)
router.get('/product-lines/:id/models', getProductLineModels);

export default router;
