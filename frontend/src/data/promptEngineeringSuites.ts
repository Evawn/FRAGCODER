/**
 * Data loader for prompt engineering response suites
 * Fetches data from the backend API
 */

import * as api from '@/api/promptEngineering';
import type { ResponseSuite, ResponseScore } from '../../../prompt-engineering/types';

// Re-export types for convenience
export type { SuiteSummary } from '@/api/promptEngineering';
export type { ResponseSuite };

/**
 * Get all available response suite summaries
 */
export async function getSuiteSummaries(): Promise<api.SuiteSummary[]> {
  return api.getSuites();
}

/**
 * Get a single suite by ID
 */
export async function loadSuite(id: string): Promise<ResponseSuite> {
  return api.getSuite(id);
}

/**
 * Run a new test suite
 */
export async function runNewSuite(description: string, model: string): Promise<ResponseSuite> {
  return api.runSuite(description, model);
}

/**
 * Update a score for a response
 */
export async function saveScore(suiteId: string, promptId: string, score: ResponseScore): Promise<void> {
  return api.updateScore(suiteId, promptId, score);
}
