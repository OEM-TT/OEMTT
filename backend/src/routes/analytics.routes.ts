/**
 * Analytics Routes
 * Admin dashboard analytics endpoints
 */

import { Router } from 'express';
import { dashboardAuth } from '@/middleware/dashboardAuth';
import * as analyticsController from '@/controllers/analytics.controller';

const router = Router();

// All routes require dashboard authentication
router.use(dashboardAuth);

// Analytics API endpoints
router.get('/overview', analyticsController.getOverview);
router.get('/costs', analyticsController.getCostAnalytics);
router.get('/chat', analyticsController.getChatAnalytics);
router.get('/chat/requests', analyticsController.getAllChatRequests);
router.get('/chat/:id', analyticsController.getChatRequestDetails);
router.get('/discovery', analyticsController.getDiscoveryAnalytics);
router.get('/users', analyticsController.getUserAnalytics);
router.get('/users/:userId/requests', analyticsController.getUserRequests);
router.get('/failures', analyticsController.getFailureAnalytics);

export default router;
