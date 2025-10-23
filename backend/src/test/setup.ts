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
    'DATABASE_URL is not set. Please create a .env.test file with PostgreSQL test database URL.\n' +
    'Example: DATABASE_URL="postgresql://shader_user:shader_password@localhost:5432/shader_playground_test"'
  );
}

// Safety checks: prevent accidentally using dev/production database
const dbUrl = process.env.DATABASE_URL;
const isPostgreSQL = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

if (!isPostgreSQL) {
  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string (postgresql://).\n' +
    'Tests now use PostgreSQL to match dev/production environments.\n' +
    'Make sure PostgreSQL is running: docker compose up postgres -d'
  );
}

// PostgreSQL safety checks - prevent using dev/production database
if (!dbUrl.includes('test')) {
  throw new Error(
    'DATABASE_URL must contain "test" in the database name for testing.\n' +
    'This prevents accidentally using production/development databases.\n' +
    'Expected: shader_playground_test\n' +
    'Got: ' + dbUrl
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
