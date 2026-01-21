import { Router } from 'express';
import { devLogin } from '../controllers/auth.controller';

const router = Router();

// DEV MODE ONLY - Direct login bypass
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', devLogin);
}

export default router;
