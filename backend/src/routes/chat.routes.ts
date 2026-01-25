/**
 * Chat Routes
 * 
 * Routes for AI-powered chat functionality.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as chatController from '@/controllers/chat.controller';

const router = Router();

// Ask a question about a unit (streaming SSE response)
router.post('/ask', authenticate, chatController.askQuestion);

// Get question history
router.get('/history', authenticate, chatController.getQuestionHistory);

// Get a single question by ID
router.get('/question/:questionId', authenticate, chatController.getQuestionById);

export default router;
