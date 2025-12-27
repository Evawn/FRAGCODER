/**
 * Prompt Engineering API Client
 * Handles communication with the prompt engineering backend endpoints
 */

import { apiClient } from './client';
import type { GoldenDataset, ResponseSuite, ResponseScore } from '../../../prompt-engineering/types';

/**
 * Suite summary for list display
 */
export interface SuiteSummary {
  id: string;
  description: string;
  model: string;
  createdAt: string;
  metadata: ResponseSuite['metadata'];
  averageScore?: number;
}

/**
 * Get the golden dataset
 */
export async function getGoldenDataset(): Promise<GoldenDataset> {
  const response = await apiClient.get<GoldenDataset>('/api/prompt-engineering/golden-dataset');
  return response.data;
}

/**
 * Get all response suites
 */
export async function getSuites(): Promise<SuiteSummary[]> {
  const response = await apiClient.get<SuiteSummary[]>('/api/prompt-engineering/suites');
  return response.data;
}

/**
 * Get a single response suite by ID
 */
export async function getSuite(id: string): Promise<ResponseSuite> {
  const response = await apiClient.get<ResponseSuite>(`/api/prompt-engineering/suites/${id}`);
  return response.data;
}

/**
 * Run a new test suite
 */
export async function runSuite(description: string, model: string): Promise<ResponseSuite> {
  const response = await apiClient.post<ResponseSuite>('/api/prompt-engineering/suites/run', {
    description,
    model,
  });
  return response.data;
}

/**
 * Update a score for a response in a suite
 */
export async function updateScore(suiteId: string, promptId: string, score: ResponseScore): Promise<void> {
  await apiClient.put(`/api/prompt-engineering/suites/${suiteId}/scores`, {
    promptId,
    score,
  });
}
