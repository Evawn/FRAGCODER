/**
 * Prompt Engineering API Client
 * Handles communication with the prompt engineering backend endpoints
 */

import { apiClient, API_BASE_URL } from './client';
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
 * Run a new test suite (legacy - use runSuiteWithProgress for streaming)
 */
export async function runSuite(description: string, model: string): Promise<ResponseSuite> {
  const response = await apiClient.post<ResponseSuite>('/api/prompt-engineering/suites/run', {
    description,
    model,
  });
  return response.data;
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
  }
): () => void {
  const abortController = new AbortController();

  // Use fetch directly for streaming SSE support
  fetch(`${API_BASE_URL}/api/prompt-engineering/suites/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, model }),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEvent) {
                case 'start':
                  callbacks.onStart?.(data);
                  break;
                case 'total':
                  callbacks.onTotal?.(data.total);
                  break;
                case 'progress':
                  callbacks.onProgress?.(data.current, data.total);
                  break;
                case 'complete':
                  callbacks.onComplete?.(data as ResponseSuite);
                  break;
                case 'error':
                  callbacks.onError?.(data.error);
                  break;
                case 'cancelled':
                  callbacks.onCancelled?.();
                  break;
              }
            } catch {
              // Ignore JSON parse errors
            }
            currentEvent = '';
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || 'Unknown error');
      }
    });

  return () => abortController.abort();
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

/**
 * Cancel an in-progress suite run
 */
export async function cancelRun(runId: string): Promise<void> {
  await apiClient.post(`/api/prompt-engineering/suites/${runId}/cancel`);
}

/**
 * Active run info returned from status endpoint
 */
export interface ActiveRunInfo {
  id: string;
  description: string;
  model: string;
  current: number;
  total: number;
  startedAt: string;
}

/**
 * Get currently running suites
 */
export async function getRunningStatus(): Promise<ActiveRunInfo[]> {
  const response = await apiClient.get<{ runs: ActiveRunInfo[] }>('/api/prompt-engineering/suites/status');
  return response.data.runs;
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
  }
): () => void {
  const abortController = new AbortController();

  fetch(`${API_BASE_URL}/api/prompt-engineering/suites/${runId}/subscribe`, {
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEvent) {
                case 'start':
                  callbacks.onStart?.(data);
                  break;
                case 'total':
                  callbacks.onTotal?.(data.total);
                  break;
                case 'progress':
                  callbacks.onProgress?.(data.current, data.total);
                  break;
                case 'complete':
                  callbacks.onComplete?.(data as ResponseSuite);
                  break;
                case 'error':
                  callbacks.onError?.(data.error);
                  break;
                case 'cancelled':
                  callbacks.onCancelled?.();
                  break;
              }
            } catch {
              // Ignore JSON parse errors
            }
            currentEvent = '';
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || 'Unknown error');
      }
    });

  return () => abortController.abort();
}
