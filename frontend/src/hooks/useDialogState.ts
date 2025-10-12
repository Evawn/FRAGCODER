import { useState, useCallback } from 'react';

/**
 * Custom hook for managing common dialog state in an imperative style.
 * Handles loading, error, and open/close state management.
 */
export function useDialogState() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    setLoading: setLoadingState,
    setError: setErrorState,
    clearError,
    resetState,
  };
}
