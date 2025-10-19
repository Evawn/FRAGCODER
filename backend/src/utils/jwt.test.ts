// JWT utility tests - token generation, verification, expiration, and security edge cases

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from './jwt';

describe('JWT Utilities', () => {
  // Store original environment variables
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    vi.useRealTimers();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with userId and email', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'user123';
      const email = 'test@example.com';

      const token = generateToken(userId, email);
      const decoded = jwt.decode(token) as any;

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.exp - decoded.iat).toBe(604800); // 7 days in seconds
    });

    it('should use development fallback when JWT_SECRET is missing in non-production', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const token = generateToken('dev-user', 'dev@test.com');

      expect(token).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET not set - using development fallback')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should throw error when JWT_SECRET is missing in production', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      expect(() => {
        generateToken('user', 'test@example.com');
      }).toThrow('JWT_SECRET must be set in production');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'verify-user';
      const email = 'verify@test.com';

      const token = generateToken(userId, email);
      const result = verifyToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(email);
    });

    it('should return null for expired token', () => {
      process.env.JWT_SECRET = 'test-secret';

      const token = jwt.sign({ userId: 'user', email: 'test@test.com' }, 'test-secret', { expiresIn: '1s' });

      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      expect(verifyToken(token)).toBeNull();
    });

    it('should return null for malformed token', () => {
      process.env.JWT_SECRET = 'test-secret';

      const malformedTokens = [
        'not-a-jwt-token',
        'invalid.token.format',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        '',
        'Bearer token123',
      ];

      malformedTokens.forEach((token) => {
        const result = verifyToken(token);
        expect(result).toBeNull();
      });
    });

    it('should return null for token signed with wrong secret', () => {
      process.env.JWT_SECRET = 'correct-secret';

      const token = jwt.sign({ userId: 'user', email: 'test@test.com' }, 'wrong-secret', { expiresIn: '7d' });

      expect(verifyToken(token)).toBeNull();
    });

    it('should successfully generate and verify token in development mode without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const token = generateToken('dev-user', 'dev@test.com');
      const verified = verifyToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('dev-user');
      expect(verified?.email).toBe('dev@test.com');

      consoleWarnSpy.mockRestore();
    });
  });
});
