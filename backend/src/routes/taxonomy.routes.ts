import { Router } from 'express';
import {
  getTaxonomyTree,
  createCategory,
  createSubCategory,
  createProductLine,
  createModel,
  getModelDetails,
  deleteCategory,
  deleteSubCategory,
  deleteProductLine,
  deleteModel,
} from '../controllers/taxonomy.controller.js';

const router = Router();

// Public routes (no auth required for dashboard)
// Get full taxonomy tree
router.get('/tree', getTaxonomyTree);

// Get model details
router.get('/models/:id', getModelDetails);

// Create taxonomy nodes (public for dashboard - in production, add auth)
router.post('/categories', createCategory);
router.post('/sub-categories', createSubCategory);
router.post('/product-lines', createProductLine);
router.post('/models', createModel);

// Delete taxonomy nodes (public for dashboard - in production, add auth)
router.delete('/categories/:id', deleteCategory);
router.delete('/sub-categories/:id', deleteSubCategory);
router.delete('/product-lines/:id', deleteProductLine);
router.delete('/models/:id', deleteModel);

export default router;
