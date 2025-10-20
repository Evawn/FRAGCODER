/**
 * Browser-compatible logging utility with structured output and log levels.
 * Provides consistent logging interface for frontend error tracking and debugging.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Frontend logger with support for different log levels and contextual metadata.
 * In development: Outputs colorful, human-readable logs
 * In production: Outputs structured logs ready for services like Sentry/LogRocket
 */
export const logger = {
  /**
   * Log error messages with optional error object and context
   * @param message - Human-readable error description
   * @param error - Optional Error object or unknown error
   * @param context - Additional metadata (component, action, etc.)
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    log('error', message, { error, ...context });
  },

  /**
   * Log warning messages with optional context
   * @param message - Warning description
   * @param context - Additional metadata
   */
  warn: (message: string, context?: LogContext) => {
    log('warn', message, context);
  },

  /**
   * Log informational messages with optional context
   * @param message - Info description
   * @param context - Additional metadata
   */
  info: (message: string, context?: LogContext) => {
    log('info', message, context);
  },

  /**
   * Log debug messages (only shown in development)
   * @param message - Debug description
   * @param context - Additional metadata
   */
  debug: (message: string, context?: LogContext) => {
    // Skip debug logs in production for performance
    if (import.meta.env.DEV) {
      log('debug', message, context);
    }
  },
};

/**
 * Internal log implementation with environment-aware formatting
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    // Production: Structured format for error tracking services
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    // Extract error details if present
    if (context?.error) {
      const err = context.error as Error;
      logEntry['error'] = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    // Use appropriate console method for log level
    const consoleMethod = level === 'debug' ? console.log : console[level];
    consoleMethod(JSON.stringify(logEntry));

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureMessage(message, { level, extra: context });
  } else {
    // Development: Human-readable format with colors and emojis
    const emoji = getLogEmoji(level);
    const prefix = `${emoji} [${level.toUpperCase()}] ${timestamp}`;

    // Format context for readability
    const contextStr = context
      ? `\n${JSON.stringify(context, null, 2)}`
      : '';

    // Use appropriate console method for log level
    const consoleMethod = level === 'debug' ? console.log : console[level];
    consoleMethod(`${prefix} - ${message}${contextStr}`);
  }
}

/**
 * Get emoji indicator for log level (development mode only)
 */
function getLogEmoji(level: LogLevel): string {
  switch (level) {
    case 'error':
      return '❌';
    case 'warn':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'debug':
      return '🔍';
    default:
      return '📝';
  }
}
