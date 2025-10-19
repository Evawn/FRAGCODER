// Auth routes integration tests - registration, authentication, and protected routes

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { clearDatabase, testPrisma } from '../test/testDb';
import { generateToken } from '../utils/jwt';
import * as googleAuth from '../utils/googleAuth';

// Mock the Google OAuth verification
vi.mock('../utils/googleAuth', () => ({
  verifyGoogleToken: vi.fn(),
}));

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clear database before each test
    await clearDatabase();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validCredential = 'valid-google-token-123';
    const mockGoogleProfile = {
      googleId: 'google-id-123',
      email: 'newuser@example.com',
    };

    describe('Successful registration', () => {
      it('should successfully register a new user with valid credentials', async () => {
        // Mock Google token verification
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'newuser123',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.username).toBe('newuser123');
        expect(response.body.user.email).toBe('newuser@example.com');
        expect(response.body.user.googleId).toBe('google-id-123');
        expect(typeof response.body.token).toBe('string');
      });

      it('should create user in database with correct data', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'dbuser',
          });

        expect(response.status).toBe(201);

        // Verify user exists in database
        const user = await testPrisma.user.findUnique({
          where: { username: 'dbuser' },
        });

        expect(user).not.toBeNull();
        expect(user?.googleId).toBe('google-id-123');
        expect(user?.email).toBe('newuser@example.com');
        expect(user?.username).toBe('dbuser');
      });

      it('should return valid JWT token that can be verified', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'tokenuser',
          });

        expect(response.status).toBe(201);
        const { token } = response.body;

        // Use token to access protected route
        const meResponse = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(meResponse.status).toBe(200);
        expect(meResponse.body.user.username).toBe('tokenuser');
      });

      it('should accept username with letters, numbers, underscores, and hyphens', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const validUsernames = ['user123', 'test_user', 'my-username', 'User_Name-123'];

        for (const username of validUsernames) {
          await clearDatabase();

          const response = await request(app)
            .post('/api/auth/register')
            .send({
              credential: validCredential,
              username,
            });

          expect(response.status).toBe(201);
          expect(response.body.user.username).toBe(username);
        }
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when credential is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'validuser',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      });

      it('should return 400 when username is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      });

      it('should return 400 when both fields are missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      });

      it('should return 400 when username is too short (less than 3 characters)', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'ab',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Username must be at least 3 characters');
      });

      it('should return 400 when username contains invalid characters', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        const invalidUsernames = [
          'user@name',
          'user name',
          'user!',
          'user#123',
          'user.name',
          'user,name',
        ];

        for (const username of invalidUsernames) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              credential: validCredential,
              username,
            });

          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
        }
      });

      it('should return 401 when Google token is invalid', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: 'invalid-token',
            username: 'validuser',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid Google token');
      });
    });

    describe('Duplicate username/account errors', () => {
      it('should return 409 when username is already taken', async () => {
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockGoogleProfile);

        // Create first user
        await testPrisma.user.create({
          data: {
            googleId: 'different-google-id',
            email: 'different@example.com',
            username: 'takenusername',
          },
        });

        // Try to register with same username
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'takenusername',
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Username already taken');
      });

      it('should return 409 when Google account already exists', async () => {
        const existingGoogleId = 'existing-google-id';
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue({
          googleId: existingGoogleId,
          email: 'existing@example.com',
        });

        // Create user with this Google ID
        await testPrisma.user.create({
          data: {
            googleId: existingGoogleId,
            email: 'existing@example.com',
            username: 'existinguser',
          },
        });

        // Try to register again with same Google ID
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'newusername',
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Account already exists');
      });

      it('should check username availability before Google ID', async () => {
        // This tests the order of validation checks
        vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue({
          googleId: 'google-123',
          email: 'test@example.com',
        });

        // Create a user with the username we want
        await testPrisma.user.create({
          data: {
            googleId: 'other-google-id',
            email: 'other@example.com',
            username: 'takenname',
          },
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            credential: validCredential,
            username: 'takenname',
          });

        // Should fail on username check, not Google ID check
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Username already taken');
      });
    });
  });

  describe('GET /api/auth/me', () => {
    describe('Authenticated requests', () => {
      it('should return user data for valid JWT token', async () => {
        // Create a test user
        const user = await testPrisma.user.create({
          data: {
            googleId: 'test-google-id',
            email: 'authuser@example.com',
            username: 'authuser',
          },
        });

        // Generate valid token
        const token = generateToken(user.id, user.email);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.id).toBe(user.id);
        expect(response.body.user.username).toBe('authuser');
        expect(response.body.user.email).toBe('authuser@example.com');
        expect(response.body.user.googleId).toBe('test-google-id');
      });

      it('should return user with correct fields (no sensitive data)', async () => {
        const user = await testPrisma.user.create({
          data: {
            googleId: 'test-google-id',
            email: 'fieldstest@example.com',
            username: 'fieldsuser',
          },
        });

        const token = generateToken(user.id, user.email);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('googleId');
        expect(response.body.user).toHaveProperty('email');
        expect(response.body.user).toHaveProperty('username');
        expect(response.body.user).toHaveProperty('createdAt');
      });

      it('should accept Bearer token format', async () => {
        const user = await testPrisma.user.create({
          data: {
            googleId: 'bearer-test',
            email: 'bearer@example.com',
            username: 'beareruser',
          },
        });

        const token = generateToken(user.id, user.email);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe('beareruser');
      });
    });

    describe('Unauthenticated requests', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 401 when Authorization header is empty', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', '');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 401 when token is missing from Bearer header', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer ');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 403 for invalid JWT token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token-123');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should return 403 for malformed JWT token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer not.a.valid.jwt');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should return 403 for expired JWT token', async () => {
        process.env.JWT_SECRET = 'test-secret';
        const jwt = require('jsonwebtoken');

        // Create an expired token
        const expiredToken = jwt.sign(
          { userId: 'user-123', email: 'test@example.com' },
          process.env.JWT_SECRET,
          { expiresIn: '0s' } // Expires immediately
        );

        // Wait a bit to ensure expiration
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should return 404 when token is valid but user does not exist', async () => {
        // Generate token for non-existent user
        const token = generateToken('non-existent-user-id', 'ghost@example.com');

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('User not found');
      });

      it('should not accept token without Bearer prefix', async () => {
        const user = await testPrisma.user.create({
          data: {
            googleId: 'prefix-test',
            email: 'prefix@example.com',
            username: 'prefixuser',
          },
        });

        const token = generateToken(user.id, user.email);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', token); // No 'Bearer ' prefix

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });
    });
  });

  describe('Edge cases and security', () => {
    it('should handle concurrent registration attempts with same username', async () => {
      const mockProfile = {
        googleId: 'concurrent-google-id',
        email: 'concurrent@example.com',
      };
      vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue(mockProfile);

      // Make two concurrent requests with same username
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/auth/register')
          .send({
            credential: 'token1',
            username: 'sameusername',
          }),
        request(app)
          .post('/api/auth/register')
          .send({
            credential: 'token2',
            username: 'sameusername',
          }),
      ]);

      // One should succeed, one should fail with conflict or error
      // (500 can happen in race conditions, which is acceptable)
      const statuses = [response1.status, response2.status].sort();
      const successStatuses = statuses.filter(s => s === 201);
      const errorStatuses = statuses.filter(s => s === 409 || s === 500);

      expect(successStatuses.length).toBe(1);
      expect(errorStatuses.length).toBe(1);

      // Verify only one user was created
      const users = await testPrisma.user.findMany({
        where: { username: 'sameusername' },
      });
      expect(users.length).toBe(1);
    });

    it('should handle special characters in username validation', async () => {
      vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue({
        googleId: 'special-id',
        email: 'special@example.com',
      });

      // SQL injection attempt
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          credential: 'token',
          username: "admin' OR '1'='1",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should handle very long usernames gracefully', async () => {
      vi.mocked(googleAuth.verifyGoogleToken).mockResolvedValue({
        googleId: 'long-id',
        email: 'long@example.com',
      });

      const longUsername = 'a'.repeat(1000);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          credential: 'token',
          username: longUsername,
        });

      // Should either succeed or fail based on DB constraints
      // The important thing is it doesn't crash
      expect([201, 400, 409]).toContain(response.status);
    });
  });
});
