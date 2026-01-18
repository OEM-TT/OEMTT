import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount routes
router.use(healthRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'OEM TechTalk API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
      },
    },
  });
});

export default router;
