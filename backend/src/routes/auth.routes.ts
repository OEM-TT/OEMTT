import { Router } from 'express';
import { devLogin } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { getCurrentUser } from '../controllers/users.controller';

const router = Router();

// DEV MODE ONLY - Direct login bypass
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', devLogin);
}

// Sync user endpoint - creates user if doesn't exist
// This is a convenience endpoint that calls the same logic as /users/me
router.post('/sync', authenticate, getCurrentUser);

export default router;
