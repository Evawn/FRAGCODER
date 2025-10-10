import jwt from 'jsonwebtoken';

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
  const secret = process.env.JWT_SECRET || 'your-secret-key';

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET not set in environment variables! Using default (insecure).');
  }

  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded payload with userId and email, or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}
