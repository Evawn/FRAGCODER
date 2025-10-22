/**
 * Express server entry point with security middleware, API routes, and error handling.
 * Configures CORS, rate limiting, request logging, and mounts auth/shader route handlers.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { prisma } from './db';
import authRoutes from './routes/auth';
import shaderRoutes from './routes/shaders';
import { errorMiddleware, notFoundHandler, asyncHandler } from './middleware/errorHandler';
import { config } from './config/env';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = config.port;

// Security headers middleware
app.use(helmet());

// Configure CORS for security - supports multiple origins
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json());

// Request logging middleware - logs all HTTP requests for debugging and monitoring
// Uses 'dev' format in development (colorized, concise) and 'combined' in production (Apache-style, detailed)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting middleware - protects against abuse and DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Mount auth routes
app.use('/api/auth', authRoutes);

// Mount shader routes
app.use('/api/shaders', shaderRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK' });
});

// Database connection test endpoint
app.get('/db-test', asyncHandler(async (_req, res) => {
  await prisma.$connect();
  res.json({ database: 'Connected successfully!' });
}));

// 404 handler for unmatched routes (must be after all valid routes)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorMiddleware);

// Only start server if not in test environment
// This allows tests to import the app without starting the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV || 'development' });
  });
}

// Export app for testing
export default app;