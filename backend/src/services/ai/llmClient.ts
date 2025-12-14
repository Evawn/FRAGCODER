/**
 * LLM API Client
 * Handles communication with OpenRouter API
 */

import { AVAILABLE_AI_MODELS, DEFAULT_MODEL_ID } from '@fragcoder/shared/aiModels';

// Extract allowed model IDs from shared configuration
const ALLOWED_MODELS = AVAILABLE_AI_MODELS.map(model => model.id);

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Response from LLM API call
 */
export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call the LLM API with an engineered prompt
 * @param prompt - Engineered prompt ready for LLM
 * @param requestedModel - Optional model ID to use
 * @returns LLM response with content and usage metrics
 */
export async function callLLM(prompt: string, requestedModel?: string): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const defaultModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL_ID;

  // Validate and select model - use requested if allowed, otherwise fall back to default
  const model = requestedModel && ALLOWED_MODELS.includes(requestedModel)
    ? requestedModel
    : defaultModel;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'FragCoder',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}
