/**
 * AI Routes
 * Handles AI-related API endpoints for the shader assistant
 */

import express from 'express';
import type { AIPromptRequest } from '@fragcoder/shared';
import { authenticateToken } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/aiRateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import * as aiService from '../services/aiService';

const router = express.Router();

/**
 * POST /api/ai/prompt
 * Process a user prompt through the AI pipeline
 *
 * Requires: Authorization: Bearer <token>
 * Request body: { prompt: string }
 * Response: { message: string, usage?: AIUsageMetrics }
 */
router.post(
  '/prompt',
  aiRateLimiter,
  asyncHandler(authenticateToken),
  asyncHandler(async (req, res) => {
    const { prompt, model, code, history, errors, intent } = req.body as AIPromptRequest;
    const result = await aiService.processPrompt(prompt, req.user!.id, model, code, history, errors, intent);
    res.json(result);
  })
);

export default router;
