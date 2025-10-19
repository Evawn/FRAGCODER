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

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
    });

    it('should generate token with correct payload (userId and email)', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'user456';
      const email = 'user@test.com';

      const token = generateToken(userId, email);
      const decoded = jwt.decode(token) as any;

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
    });

    it('should generate token with 7-day expiration', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'user789';
      const email = 'expiry@test.com';

      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = generateToken(userId, email);
      const afterGeneration = Math.floor(Date.now() / 1000);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();

      // Token should expire in ~7 days (604800 seconds)
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(604800); // 7 days in seconds

      // Issued time should be around now
      expect(decoded.iat).toBeGreaterThanOrEqual(beforeGeneration);
      expect(decoded.iat).toBeLessThanOrEqual(afterGeneration);
    });

    it('should use development fallback when JWT_SECRET is missing in non-production', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const userId = 'dev-user';
      const email = 'dev@test.com';
      const token = generateToken(userId, email);

      expect(token).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET not set - using development fallback')
      );

      // Verify token can be decoded with dev secret
      const decoded = jwt.verify(token, 'dev-secret-key-unsafe') as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);

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
      const userId = 'expired-user';
      const email = 'expired@test.com';

      // Generate token with very short expiry
      const token = jwt.sign(
        { userId, email },
        'test-secret',
        { expiresIn: '1s' }
      );

      // Fast-forward time by 2 seconds
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      const result = verifyToken(token);
      expect(result).toBeNull();
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
      const userId = 'secret-user';
      const email = 'secret@test.com';

      // Generate token with different secret
      const token = jwt.sign(
        { userId, email },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it('should verify token with development fallback when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const userId = 'dev-verify';
      const email = 'dev-verify@test.com';

      // Generate token with dev secret
      const token = generateToken(userId, email);

      // Verify it works
      const result = verifyToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(email);

      consoleWarnSpy.mockRestore();
    });

    it('should return null when verifying in production without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      // Create a token (doesn't matter with what secret)
      const token = jwt.sign(
        { userId: 'test', email: 'test@example.com' },
        'some-secret',
        { expiresIn: '7d' }
      );

      // verifyToken catches the error and returns null
      const result = verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('Round-trip token generation and verification', () => {
    it('should successfully generate and verify token in normal operation', () => {
      process.env.JWT_SECRET = 'round-trip-secret';
      const userId = 'round-trip-user';
      const email = 'roundtrip@test.com';

      // Generate token
      const token = generateToken(userId, email);
      expect(token).toBeDefined();

      // Verify token
      const verified = verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userId);
      expect(verified?.email).toBe(email);
    });

    it('should successfully generate and verify token in development mode without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const userId = 'dev-round-trip';
      const email = 'dev-roundtrip@test.com';

      // Generate token with dev fallback
      const token = generateToken(userId, email);
      expect(token).toBeDefined();

      // Verify token with dev fallback
      const verified = verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userId);
      expect(verified?.email).toBe(email);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge cases and security', () => {
    it('should handle empty userId and email', () => {
      process.env.JWT_SECRET = 'test-secret';

      const token = generateToken('', '');
      const verified = verifyToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('');
      expect(verified?.email).toBe('');
    });

    it('should handle special characters in userId and email', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'user!@#$%^&*()_+-=[]{}|;:,.<>?';
      const email = 'test+tag@example.co.uk';

      const token = generateToken(userId, email);
      const verified = verifyToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userId);
      expect(verified?.email).toBe(email);
    });

    it('should not verify token after exactly 7 days', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'expiry-test';
      const email = 'expiry@test.com';

      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateToken(userId, email);

      // Advance time by exactly 7 days + 1 second
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      vi.advanceTimersByTime(sevenDaysInMs + 1000);

      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it('should still verify token before 7 days expiration', () => {
      process.env.JWT_SECRET = 'test-secret';
      const userId = 'valid-expiry';
      const email = 'valid@test.com';

      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const token = generateToken(userId, email);

      // Advance time by 6 days, 23 hours
      const almostSevenDays = 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000;
      vi.advanceTimersByTime(almostSevenDays);

      const result = verifyToken(token);
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(email);
    });
  });
});
