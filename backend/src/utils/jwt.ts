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
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('⚠️ JWT_SECRET not set - using development fallback. DO NOT USE IN PRODUCTION!');
    return jwt.sign({ userId, email }, 'dev-secret-key-unsafe', { expiresIn: '7d' });
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
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      // Use same dev fallback as generateToken
      const decoded = jwt.verify(token, 'dev-secret-key-unsafe') as JwtPayload;
      return decoded;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    return null;
  }
}
