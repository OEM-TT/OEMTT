import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSavedUnits,
  getSavedUnitById,
  createSavedUnit,
  updateSavedUnit,
  deleteSavedUnit,
} from '../controllers/savedUnits.controller';

const router = Router();

// All saved unit routes require authentication
router.use(authenticate);

// GET /api/saved-units - Get all saved units
router.get('/', getSavedUnits);

// GET /api/saved-units/:id - Get single saved unit
router.get('/:id', getSavedUnitById);

// POST /api/saved-units - Create new saved unit
router.post('/', createSavedUnit);

// PATCH /api/saved-units/:id - Update saved unit
router.patch('/:id', updateSavedUnit);

// DELETE /api/saved-units/:id - Delete saved unit
router.delete('/:id', deleteSavedUnit);

export default router;
