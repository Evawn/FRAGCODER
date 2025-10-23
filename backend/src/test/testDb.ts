// Test database utilities - helpers for managing test data and database state

import { PrismaClient } from '@prisma/client';

// Create a separate Prisma client for test database operations
// This allows tests to clean up data without affecting the main application
// NOTE: DATABASE_URL is loaded from .env.test by the test setup
export const testPrisma = new PrismaClient();

/**
 * Clears all data from the database
 * Use this in beforeEach/afterEach to ensure test isolation
 */
export async function clearDatabase() {
  // Delete in reverse order of dependencies to avoid foreign key constraints
  await testPrisma.shader.deleteMany({});
  await testPrisma.user.deleteMany({});
}

/**
 * Seeds the database with test data
 * Use this to create common test fixtures
 */
export async function seedTestData() {
  // Example: Create a test user
  const testUser = await testPrisma.user.create({
    data: {
      googleId: 'test-google-id',
      email: 'test@example.com',
      username: 'testuser',
    },
  });

  // Example: Create a test shader
  const testShader = await testPrisma.shader.create({
    data: {
      slug: 'test-shader',
      title: 'Test Shader',
      description: 'A test shader for integration tests',
      userId: testUser.id,
      isPublic: true,
      tabs: JSON.stringify([
        {
          id: '1',
          name: 'Main',
          code: 'void main() { gl_FragColor = vec4(1.0); }',
        },
      ]),
    },
  });

  return { testUser, testShader };
}

/**
 * Creates a test user with optional custom data
 */
export async function createTestUser(overrides: {
  googleId?: string;
  email?: string;
  username?: string;
} = {}) {
  return testPrisma.user.create({
    data: {
      googleId: overrides.googleId || `test-google-${Date.now()}`,
      email: overrides.email || `test-${Date.now()}@example.com`,
      username: overrides.username || `testuser-${Date.now()}`,
    },
  });
}

/**
 * Creates a test shader with optional custom data
 */
export async function createTestShader(
  userId: string,
  overrides: {
    slug?: string;
    title?: string;
    description?: string;
    isPublic?: boolean;
    tabs?: string;
  } = {}
) {
  return testPrisma.shader.create({
    data: {
      slug: overrides.slug || `test-shader-${Date.now()}`,
      title: overrides.title || 'Test Shader',
      description: overrides.description || 'A test shader',
      userId,
      isPublic: overrides.isPublic ?? true,
      tabs: overrides.tabs || JSON.stringify([
        {
          id: '1',
          name: 'Main',
          code: 'void main() { gl_FragColor = vec4(1.0); }',
        },
      ]),
    },
  });
}
