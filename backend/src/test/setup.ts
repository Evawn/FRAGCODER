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

// Ensure required environment variables are set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}
if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
}

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
