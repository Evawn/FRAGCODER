/**
 * AI API Client
 * Handles communication with the AI backend endpoints
 */

import { apiClient } from './client';
import type { AIPromptRequest, AIPromptResponse, ChatHistoryEntry, CompilationError } from '@fragcoder/shared';

/**
 * Send a prompt to the AI assistant
 * @param prompt - User's prompt text
 * @param model - Optional model ID to use
 * @param code - Optional current editor code for context
 * @param history - Optional chat history for conversational context (up to 5 entries)
 * @param errors - Optional compilation errors for debugging context
 * @returns AI response with message and usage metrics
 */
export async function sendPrompt(
  prompt: string,
  model?: string,
  code?: string,
  history?: ChatHistoryEntry[],
  errors?: CompilationError[]
): Promise<AIPromptResponse> {
  const request: AIPromptRequest = { prompt, model, code, history, errors };
  const response = await apiClient.post<AIPromptResponse>('/api/ai/prompt', request);
  return response.data;
}
