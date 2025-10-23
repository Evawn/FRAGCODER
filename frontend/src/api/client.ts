/**
 * Centralized axios HTTP client with error handling interceptor.
 * Provides consistent error transformation and API base URL configuration.
 */

import axios, { AxiosError } from 'axios';
import type { ErrorResponse, ApiError } from '@fragcoder/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Axios instance configured with base URL and interceptors
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Response interceptor to handle errors consistently
 * Transforms backend errors into structured ApiError format
 */
apiClient.interceptors.response.use(
  // Success response - pass through unchanged
  (response) => response,

  // Error response - transform into ApiError
  (error: AxiosError<ErrorResponse>) => {
    // Network error (no response from server)
    if (!error.response) {
      const apiError: ApiError = {
        message: 'Network error. Please check your internet connection.',
        statusCode: 0,
        details: error.message,
      };
      return Promise.reject(apiError);
    }

    // HTTP error with response from backend
    const apiError: ApiError = {
      message: error.response.data?.error || error.message || 'An error occurred',
      statusCode: error.response.status,
      details: error.response.data,
    };

    return Promise.reject(apiError);
  }
);

/**
 * Set authorization token for all subsequent requests
 * @param token - JWT token or null to remove
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'statusCode' in error
  );
}

/**
 * Extract user-friendly error message from any error
 * Useful for displaying errors in UI components
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
