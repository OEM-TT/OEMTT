import { Router } from 'express';
import healthRoutes from './health.routes';
import usersRoutes from './users.routes';
import savedUnitsRoutes from './savedUnits.routes';
import authRoutes from './auth.routes';
import oemsRoutes from './oems.routes';
import modelsRoutes from './models.routes';
import manualsRoutes from './manuals.routes';

const router = Router();

// Mount routes
router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/saved-units', savedUnitsRoutes);
router.use('/oems', oemsRoutes);
router.use('/models', modelsRoutes);
router.use('/manuals', manualsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'OEM TechTalk API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: {
          devLogin: '/api/auth/dev-login (DEV MODE ONLY)',
        },
        users: {
          me: '/api/users/me',
        },
        savedUnits: {
          list: '/api/saved-units',
          get: '/api/saved-units/:id',
          create: '/api/saved-units',
          update: '/api/saved-units/:id',
          delete: '/api/saved-units/:id',
        },
        oems: {
          list: '/api/oems',
          get: '/api/oems/:id',
          productLines: '/api/oems/:id/product-lines',
          models: '/api/oems/product-lines/:id/models',
        },
        models: {
          search: '/api/models/search?q=<query>',
          get: '/api/models/:id',
          manuals: '/api/models/:id/manuals',
        },
        manuals: {
          get: '/api/manuals/:id',
          sections: '/api/manuals/:id/sections',
          searchSections: '/api/manuals/search-sections?q=<query>',
        },
      },
    },
  });
});

export default router;
