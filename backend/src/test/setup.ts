// Global test setup - runs once before all test files
// Configures test environment and loads environment variables

import dotenv from 'dotenv';
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../db';

// Load test environment variables (override any existing env vars)
dotenv.config({ path: '.env.test', override: true });

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure we're using a test database, not the dev database
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Please create a .env.test file with DATABASE_URL="file:./test.db"'
  );
}

// Safety check: prevent accidentally using dev database
if (process.env.DATABASE_URL.includes('dev.db')) {
  throw new Error(
    'Tests are configured to use dev.db! This would clear your development data. ' +
    'Please update .env.test to use DATABASE_URL="file:./prisma/test.db"'
  );
}

// Additional safety check: ensure test database is in the correct location
if (!process.env.DATABASE_URL.includes('test.db')) {
  throw new Error(
    'DATABASE_URL must point to test.db for testing. ' +
    'Please update .env.test to use DATABASE_URL="file:./prisma/test.db"'
  );
}

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
