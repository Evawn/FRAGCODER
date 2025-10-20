/**
 * React Error Boundary component that catches runtime errors and displays fallback UI.
 * Integrates with logger utility for error tracking and provides user-friendly recovery options.
 */
import { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree.
 * Must be a class component as React Error Boundaries require componentDidCatch lifecycle method.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to our logging utility with component stack trace
    logger.error('React Error Boundary caught an error', error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorInfo,
    });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI with user-friendly error message and recovery options
 */
function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {isDevelopment && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-red-500">Error Details (Development Mode)</h2>
            <p className="text-sm font-mono text-foreground break-all">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <details className="text-xs font-mono text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Stack Trace</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors font-medium"
          >
            Go to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-muted text-muted-foreground rounded-md hover:bg-muted/90 transition-colors font-medium"
          >
            Reload Page
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          If this problem persists, please try clearing your browser cache or contact support.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
