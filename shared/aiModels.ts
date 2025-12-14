/**
 * AI Model Configuration
 * Single source of truth for available AI models across frontend and backend
 */

/**
 * Represents an AI model available for use in FragCoder
 */
export interface AIModel {
  /** OpenRouter API model identifier */
  id: string;
  /** Human-readable model name for UI display */
  name: string;
  /** Model provider (e.g., 'Google', 'Anthropic') */
  provider: string;
}

/**
 * Available AI models for FragCoder
 * Ordered by preference (default first)
 */
export const AVAILABLE_AI_MODELS: readonly AIModel[] = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
  },
] as const;

/**
 * Default model ID used when no model is specified
 * Set to the first model in AVAILABLE_AI_MODELS
 */
export const DEFAULT_MODEL_ID = AVAILABLE_AI_MODELS[0].id;
