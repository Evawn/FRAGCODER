/**
 * Types for the Prompt Engineering Evaluation Framework
 * Used by both the CLI runner and the frontend UI
 */

import type { AIPromptRequest, AIPromptResponse, CompilationError } from '../shared/types';

// Re-export for convenience
export type { AIPromptRequest, AIPromptResponse, CompilationError };

/**
 * A single entry in the golden dataset
 */
export interface GoldenPrompt {
  id: string;
  input: AIPromptRequest;
  notes: string;
  tags: string[];
  expectedBehavior?: string;
}

/**
 * Golden dataset file structure
 */
export interface GoldenDataset {
  prompts: GoldenPrompt[];
}

/**
 * Manual scoring for an AI response
 */
export interface ResponseScore {
  visualQuality: 1 | 2 | 3 | 4 | 5;
  accuracy: 1 | 2 | 3 | 4 | 5;
  explanationQuality: 1 | 2 | 3 | 4 | 5;
  codeQuality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  scoredAt: string;
}

/**
 * A single prompt/response pair in a test suite
 */
export interface PromptResponse {
  promptId: string;
  prompt: GoldenPrompt;
  response: AIPromptResponse;
  latencyMs: number;
  compilationSuccess: boolean;
  compilationErrors?: CompilationError[];
  score?: ResponseScore;
}

/**
 * A complete test run (response suite)
 */
export interface ResponseSuite {
  id: string;
  description: string;
  model: string;
  createdAt: string;
  responses: PromptResponse[];
  metadata: {
    totalPrompts: number;
    successfulCompilations: number;
    averageLatencyMs: number;
    scoredCount: number;
  };
}
