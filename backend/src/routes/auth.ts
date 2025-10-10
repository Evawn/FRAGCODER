import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyGoogleToken } from '../utils/googleAuth';
import { generateToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/google
 * Check if user exists with this Google account
 *
 * Request body: { credential: string }
 * Response: { exists: boolean, user?: User, token?: string, profile?: GoogleProfile }
 */
router.post('/google', async (req, res): Promise<any> => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'No credential provided' });
  }

  try {
    // Verify Google token
    const profile = await verifyGoogleToken(credential);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid Google token' });
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
  } catch (error) {
    console.error('Error in /api/auth/google:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Create new user account with Google OAuth
 *
 * Request body: { credential: string, username: string }
 * Response: { user: User, token: string }
 */
router.post('/register', async (req, res): Promise<any> => {
  const { credential, username } = req.body;

  if (!credential || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate username
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    });
  }

  try {
    // Verify Google token
    const profile = await verifyGoogleToken(credential);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if user already exists with this Google ID
    const existingUser = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Account already exists' });
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

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user (protected route)
 *
 * Requires: Authorization: Bearer <token>
 * Response: { user: User }
 */
router.get('/me', authenticateToken, async (req, res): Promise<any> => {
  try {
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
