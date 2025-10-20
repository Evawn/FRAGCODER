/** JWT token generation and verification utilities for user authentication sessions. */
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT token for authenticated user
 * @param userId - User's unique ID
 * @param email - User's email address
 * @returns JWT token string valid for 7 days
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '7d' });
}

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded payload with userId and email, or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}
