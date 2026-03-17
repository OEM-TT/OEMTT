/**
 * OCR Routes
 *
 * POST /api/ocr/extract  – extract text from an HVAC serial plate image
 *
 * Rate-limited more aggressively than other routes because each request
 * hits the OpenAI Vision API and costs real money.
 * Limit: 10 requests per minute per user (generous for field use).
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '@/middleware/auth';
import { extractText } from '@/controllers/ocr.controller';

const router = Router();

// Stricter rate limit for Vision API calls (~$0.002 per image)
const ocrRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,                   // 10 scans per minute per IP
  message: {
    success: false,
    message: 'Too many scan requests. Please wait a moment before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/extract',
  ocrRateLimit,
  authenticate,
  async (req, res, next) => {
    try {
      await extractText(req, res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
