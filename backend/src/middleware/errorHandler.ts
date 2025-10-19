/**
 * Global error handling middleware for Express application.
 * Provides async handler wrapper and centralized error response formatting.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/errors';

/**
 * Async handler wrapper that eliminates need for try-catch in route handlers
 * Automatically catches rejected promises and forwards to error middleware
 *
 * @example
 * router.get('/shaders', asyncHandler(async (req, res) => {
 *   const shaders = await getShaders();
 *   res.json(shaders);
 * }));
 */
export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 * Catches all errors thrown in the application and formats consistent responses
 * Must be registered AFTER all routes in Express app
 */
export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 if error doesn't have status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Determine error message based on environment and error type
  let message: string;
  if (err instanceof AppError) {
    message = err.message;
  } else if (process.env.NODE_ENV === 'production') {
    // Hide internal error details in production
    message = 'Internal server error';
  } else {
    // Show detailed error in development
    message = err.message || 'Internal server error';
  }

  // Log error for debugging (with emoji for visibility in dev)
  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]', {
      statusCode,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('❌ Error:', {
      statusCode,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unmatched routes
 * Should be registered BEFORE error middleware but AFTER all valid routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
