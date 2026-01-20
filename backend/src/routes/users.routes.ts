import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getCurrentUser, updateCurrentUser } from '../controllers/users.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/me - Get current user
router.get('/me', getCurrentUser);

// PATCH /api/users/me - Update current user
router.patch('/me', updateCurrentUser);

export default router;
