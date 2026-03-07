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
  createOEM,
  moveModel,
  moveProductLine,
  moveSubCategory,
  moveCategory,
  updateOEM,
  updateCategory,
  updateSubCategory,
  updateProductLine,
  updateModel,
} from '../controllers/taxonomy.controller.js';

const router = Router();

// Public routes (no auth required for dashboard)
// Get full taxonomy tree
router.get('/tree', getTaxonomyTree);

// Get model details
router.get('/models/:id', getModelDetails);

// Create taxonomy nodes (public for dashboard - in production, add auth)
router.post('/oems', createOEM);
router.post('/categories', createCategory);
router.post('/sub-categories', createSubCategory);
router.post('/product-lines', createProductLine);
router.post('/models', createModel);

// Update taxonomy nodes (public for dashboard - in production, add auth)
router.patch('/oems/:id', updateOEM);
router.patch('/categories/:id', updateCategory);
router.patch('/sub-categories/:id', updateSubCategory);
router.patch('/product-lines/:id', updateProductLine);
router.patch('/models/:id', updateModel);

// Move taxonomy nodes (public for dashboard - in production, add auth)
router.patch('/models/:id/move', moveModel);
router.patch('/product-lines/:id/move', moveProductLine);
router.patch('/sub-categories/:id/move', moveSubCategory);
router.patch('/categories/:id/move', moveCategory);

// Delete taxonomy nodes (public for dashboard - in production, add auth)
router.delete('/categories/:id', deleteCategory);
router.delete('/sub-categories/:id', deleteSubCategory);
router.delete('/product-lines/:id', deleteProductLine);
router.delete('/models/:id', deleteModel);

export default router;
