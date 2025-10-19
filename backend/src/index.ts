import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';
import authRoutes from './routes/auth';
import shaderRoutes from './routes/shaders';
import { errorMiddleware, notFoundHandler, asyncHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for security
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});