import { Router } from 'express';
import {
  getTaxonomyTree,
  createCategory,
  createSubCategory,
  createProductLine,
  createModel,
} from '../controllers/taxonomy.controller.js';

const router = Router();

// Public routes (no auth required for dashboard)
// Get full taxonomy tree
router.get('/tree', getTaxonomyTree);

// Create taxonomy nodes (public for dashboard - in production, add auth)
router.post('/categories', createCategory);
router.post('/sub-categories', createSubCategory);
router.post('/product-lines', createProductLine);
router.post('/models', createModel);

export default router;
