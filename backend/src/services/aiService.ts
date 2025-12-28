/**
 * AI Service
 * Main orchestrator for the AI prompt processing pipeline
 * Uses the pipeline framework for tracing and extensibility
 */

import type { AIPromptResponse, AIIntent, ChatHistoryEntry, CompilationError } from '@fragcoder/shared';
import { ValidationError } from '../utils/errors';
import { Pipeline, PipelineContext, PipelineTrace } from './ai/pipeline';
import { SanitizeStep } from './ai/sanitizer';
import { ClassifyIntentStep } from './ai/intentClassifier';
import { EngineerPromptStep } from './ai/promptEngineer';
import { CallLLMStep } from './ai/llmClient';
import { ParseResponseStep } from './ai/responseParser';
import { logAIRequest } from './ai/metricsLogger';

/**
 * Extended response that includes the pipeline trace
 */
export interface AIPromptResponseWithTrace extends AIPromptResponse {
  trace: PipelineTrace;
}

/**
 * The AI Prompt Processing Pipeline
 * Steps: sanitize -> classifyIntent -> engineerPrompt -> callLLM -> parseResponse
 */
const aiPipeline = new Pipeline([
  new SanitizeStep(),
  new ClassifyIntentStep(),
  new EngineerPromptStep(),
  new CallLLMStep(),
  new ParseResponseStep(),
]);

/**
 * Process a user prompt through the AI pipeline
 * Pipeline: sanitize -> classify intent -> engineer -> call LLM -> parse
 *
 * Backwards-compatible signature - returns standard AIPromptResponse
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
  const responseWithTrace = await processPromptWithTrace(
    prompt, userId, model, code, history, errors, overrideIntent
  );

  // Strip trace for backwards compatibility
  const { trace: _trace, ...response } = responseWithTrace;
  return response;
}

/**
 * Process a user prompt with full pipeline trace
 * Use this for debugging, evaluation, and prompt engineering
 *
 * @param prompt - Raw user prompt
 * @param userId - Authenticated user's ID
 * @param model - Optional model ID to use
 * @param code - Optional current editor code for context
 * @param history - Optional chat history for conversational context
 * @param errors - Optional compilation errors for debugging context
 * @param overrideIntent - Optional intent override (skips auto-classification)
 * @returns AI response with trace containing all intermediate step data
 */
export async function processPromptWithTrace(
  prompt: string,
  userId: string,
  model?: string,
  code?: string,
  history?: ChatHistoryEntry[],
  errors?: CompilationError[],
  overrideIntent?: AIIntent
): Promise<AIPromptResponseWithTrace> {
  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ValidationError('Prompt is required and must be a non-empty string');
  }

  try {
    const ctx: PipelineContext = {
      input: {
        prompt,
        userId,
        model,
        code,
        history,
        errors,
        overrideIntent,
      },
    };

    const { result, trace } = await aiPipeline.execute(ctx);

    // Log successful request
    logAIRequest({
      userId,
      promptTokens: result.llmResponse?.usage.promptTokens ?? 0,
      completionTokens: result.llmResponse?.usage.completionTokens ?? 0,
      totalTokens: result.llmResponse?.usage.totalTokens ?? 0,
      latencyMs: trace.totalLatencyMs,
      success: true,
    });

    return {
      code: result.parsedResponse?.code,
      explanation: result.parsedResponse!.explanation,
      usage: result.llmResponse?.usage,
      intent: result.intent!,
      trace,
    };
  } catch (error) {
    // Extract trace from error if available
    const trace = (error as Error & { trace?: PipelineTrace }).trace;

    // Log failed request
    logAIRequest({
      userId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: trace?.totalLatencyMs ?? 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// Re-export types for convenience
export type { PipelineTrace };
