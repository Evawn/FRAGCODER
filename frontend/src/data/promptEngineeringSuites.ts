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
 * Run a new test suite (legacy - blocks until complete)
 */
export async function runNewSuite(description: string, model: string): Promise<ResponseSuite> {
  return api.runSuite(description, model);
}

/**
 * Run a new test suite with streaming progress updates
 * Returns a cancel function to abort the request
 */
export function runSuiteWithProgress(
  description: string,
  model: string,
  callbacks: {
    onStart?: (info: { id: string; description: string; model: string }) => void;
    onTotal?: (total: number) => void;
    onProgress?: (current: number, total: number) => void;
    onComplete?: (suite: ResponseSuite) => void;
    onError?: (error: string) => void;
    onCancelled?: () => void;
    onStreamEnd?: () => void;
  }
): () => void {
  return api.runSuiteWithProgress(description, model, callbacks);
}

/**
 * Update a score for a response
 */
export async function saveScore(suiteId: string, promptId: string, score: ResponseScore): Promise<void> {
  return api.updateScore(suiteId, promptId, score);
}

/**
 * Verify compilation results and auto-score failed compilations
 * Called once when a suite is first viewed
 */
export async function verifyCompilation(
  suiteId: string,
  data: {
    successfulCompilations: number;
    responsesExpectingCode: number;
    failedPromptScores: Array<{ promptId: string; score: ResponseScore }>;
  }
): Promise<void> {
  return api.verifyCompilation(suiteId, data);
}

// Re-export active run types
export type { ActiveRunInfo } from '@/api/promptEngineering';

/**
 * Get currently running suites
 */
export async function getRunningStatus(): Promise<api.ActiveRunInfo[]> {
  return api.getRunningStatus();
}

/**
 * Cancel an in-progress suite run
 */
export async function cancelRun(runId: string): Promise<void> {
  return api.cancelRun(runId);
}

/**
 * Subscribe to progress updates for an active run
 * Returns a cancel function to abort the subscription
 */
export function subscribeToRun(
  runId: string,
  callbacks: {
    onStart?: (info: { id: string; description: string; model: string }) => void;
    onTotal?: (total: number) => void;
    onProgress?: (current: number, total: number) => void;
    onComplete?: (suite: ResponseSuite) => void;
    onError?: (error: string) => void;
    onCancelled?: () => void;
    onStreamEnd?: () => void;
  }
): () => void {
  return api.subscribeToRun(runId, callbacks);
}
