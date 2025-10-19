// Global test setup - runs once before all test files
// Configures test environment and loads environment variables

import dotenv from 'dotenv';
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../db';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// If .env.test doesn't exist, fall back to regular .env
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

// Set test environment
process.env.NODE_ENV = 'test';

// Connect to database before all tests
beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});
