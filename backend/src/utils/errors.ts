/**
 * Custom error classes for standardized error handling across the backend.
 * Provides type-safe errors with HTTP status codes and production-safe messaging.
 */

/**
 * Base application error class that extends Error with HTTP status code support
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   * Hides sensitive details in production
   */
  toJSON(includeStack: boolean = false) {
    const response: any = {
      error: this.message,
      statusCode: this.statusCode,
    };

    if (includeStack && process.env.NODE_ENV !== 'production') {
      response.stack = this.stack;
    }

    return response;
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Invalid request data') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden - User lacks permission for this resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(message, 403);
  }
}

/**
 * 404 Not Found - Requested resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * 409 Conflict - Request conflicts with current state (e.g., duplicate username)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', isOperational: boolean = false) {
    super(message, 500, isOperational);
  }
}
