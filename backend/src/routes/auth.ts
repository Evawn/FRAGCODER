/** Authentication API routes for Google OAuth sign-in, user registration, and session management. */
import express from 'express';
import { prisma } from '../db';
import { verifyGoogleToken } from '../utils/googleAuth';
import { generateToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

const router = express.Router();

/**
 * POST /api/auth/google
 * Check if user exists with this Google account
 *
 * Request body: { credential: string }
 * Response: { exists: boolean, user?: User, token?: string, profile?: GoogleProfile }
 */
router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ValidationError('No credential provided');
  }

  // Verify Google token
  const profile = await verifyGoogleToken(credential);
  if (!profile) {
    throw new UnauthorizedError('Invalid Google token');
  }

  // Check if user exists by Google ID
  const user = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    select: {
      id: true,
      googleId: true,
      email: true,
      username: true,
      createdAt: true,
    },
  });

  if (user) {
    // User exists - sign them in
    const token = generateToken(user.id, user.email);
    return res.json({
      exists: true,
      user,
      token,
    });
  }

  // User doesn't exist - return profile data for registration
  return res.json({
    exists: false,
    profile,
  });
}));

/**
 * POST /api/auth/register
 * Create new user account with Google OAuth
 *
 * Request body: { credential: string, username: string }
 * Response: { user: User, token: string }
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { credential, username } = req.body;

  if (!credential || !username) {
    throw new ValidationError('Missing required fields');
  }

  // Validate username
  if (username.length < 3) {
    throw new ValidationError('Username must be at least 3 characters');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new ValidationError('Username can only contain letters, numbers, underscores, and hyphens');
  }

  // Verify Google token
  const profile = await verifyGoogleToken(credential);
  if (!profile) {
    throw new UnauthorizedError('Invalid Google token');
  }

  // Check if username is already taken
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) {
    throw new ConflictError('Username already taken');
  }

  // Check if user already exists with this Google ID
  const existingUser = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
  });

  if (existingUser) {
    throw new ConflictError('Account already exists');
  }

  // Create new user
  const user = await prisma.user.create({
    data: {
      googleId: profile.googleId,
      email: profile.email,
      username,
    },
    select: {
      id: true,
      googleId: true,
      email: true,
      username: true,
      createdAt: true,
    },
  });

  // Generate JWT token
  const token = generateToken(user.id, user.email);

  return res.status(201).json({
    user,
    token,
  });
}));

/**
 * GET /api/auth/me
 * Get current authenticated user (protected route)
 *
 * Requires: Authorization: Bearer <token>
 * Response: { user: User }
 */
router.get('/me', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      googleId: true,
      email: true,
      username: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return res.json({ user });
}));

export default router;
