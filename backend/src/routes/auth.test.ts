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
    });

    describe('Validation errors', () => {
      it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'validuser',
          });

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

        const invalidUsernames = ['user@name', 'user name', 'user!'];

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
    });

    describe('Unauthenticated requests', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app)
          .get('/api/auth/me');

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

      it('should return 404 when token is valid but user does not exist', async () => {
        // Generate token for non-existent user
        const token = generateToken('non-existent-user-id', 'ghost@example.com');

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('User not found');
      });
    });
  });
});
