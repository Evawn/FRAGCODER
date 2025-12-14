/**
 * AI Service
 * Main orchestrator for the AI prompt processing pipeline
 * Coordinates sanitization, prompt engineering, LLM calls, and response parsing
 */

import type { AIPromptResponse, AIIntent, ChatHistoryEntry, CompilationError } from '@fragcoder/shared';
import { ValidationError } from '../utils/errors';
import { sanitizePrompt } from './ai/sanitizer';
import { engineerPrompt } from './ai/promptEngineer';
import { classifyIntent } from './ai/intentClassifier';
import { callLLM } from './ai/llmClient';
import { parseResponse } from './ai/responseParser';
import { logAIRequest } from './ai/metricsLogger';

/**
 * Process a user prompt through the AI pipeline
 * Pipeline: sanitize → classify intent → engineer → call LLM → parse → log
 *
 * @param prompt - Raw user prompt
 * @param userId - Authenticated user's ID
 * @param model - Optional model ID to use
 * @param code - Optional current editor code for context
 * @param history - Optional chat history for conversational context
 * @param errors - Optional compilation errors for debugging context
 * @param overrideIntent - Optional intent override (skips auto-classification)
 * @returns AI response with message and optional usage metrics
 */
export async function processPrompt(
  prompt: string,
  userId: string,
  model?: string,
  code?: string,
  history?: ChatHistoryEntry[],
  errors?: CompilationError[],
  overrideIntent?: AIIntent
): Promise<AIPromptResponse> {
  const startTime = Date.now();

  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ValidationError('Prompt is required and must be a non-empty string');
  }

  try {
    // Pipeline execution
    const sanitized = sanitizePrompt(prompt);
    const intent = overrideIntent ?? await classifyIntent(sanitized);
    const engineered = engineerPrompt(sanitized, code, history, errors, intent);
    const llmResult = await callLLM(engineered, model);
    const parsed = parseResponse(llmResult.content);

    const latencyMs = Date.now() - startTime;

    // Log successful request
    logAIRequest({
      userId,
      promptTokens: llmResult.usage.promptTokens,
      completionTokens: llmResult.usage.completionTokens,
      totalTokens: llmResult.usage.totalTokens,
      latencyMs,
      success: true,
    });

    return {
      code: parsed.code,
      explanation: parsed.explanation,
      usage: llmResult.usage,
      intent,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log failed request
    logAIRequest({
      userId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
