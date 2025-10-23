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

// Safety checks: prevent accidentally using dev/production database
// Support both SQLite (local) and PostgreSQL (CI) test databases
const dbUrl = process.env.DATABASE_URL;
const isSQLite = dbUrl.startsWith('file:');
const isPostgreSQL = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

if (isSQLite) {
  // SQLite safety checks (local development)
  if (dbUrl.includes('dev.db')) {
    throw new Error(
      'Tests are configured to use dev.db! This would clear your development data. ' +
      'Please update .env.test to use DATABASE_URL="file:./prisma/test.db"'
    );
  }
  if (!dbUrl.includes('test.db')) {
    throw new Error(
      'DATABASE_URL must point to test.db for testing. ' +
      'Please update .env.test to use DATABASE_URL="file:./prisma/test.db"'
    );
  }
} else if (isPostgreSQL) {
  // PostgreSQL safety checks (CI or remote test database)
  if (!dbUrl.includes('test')) {
    throw new Error(
      'DATABASE_URL must contain "test" in the database name for testing. ' +
      'This prevents accidentally using production/development databases.'
    );
  }
} else {
  throw new Error(
    'Unsupported DATABASE_URL format. Must be either SQLite (file:) or PostgreSQL (postgresql://)'
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
