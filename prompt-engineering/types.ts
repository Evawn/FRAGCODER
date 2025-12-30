/**
 * Types for the Prompt Engineering Evaluation Framework
 * Used by both the CLI runner and the frontend UI
 */

import type { AIPromptRequest, AIPromptResponse, CompilationError } from '../shared/types';
import type { PipelineTrace } from '../backend/src/services/ai/pipeline';

// Re-export for convenience
export type { AIPromptRequest, AIPromptResponse, CompilationError, PipelineTrace };

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
 * All scores are on a -10 to +10 scale with 0.1 precision
 */
export interface ResponseScore {
  visualQuality: number;
  promptCorrectness: number;
  codeQuality: number;
  explanationQuality: number;
  creativity: number;
  overallSatisfaction: number;
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
  trace?: PipelineTrace;
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
    compilationVerified?: boolean;    // True after first view processes compilation
    responsesExpectingCode?: number;  // Count of responses that should have code (excludes explain-only)
  };
}
