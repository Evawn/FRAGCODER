import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../db';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

/**
 * Authentication middleware for protected routes
 * Verifies JWT token and attaches user to request object
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Extract token from Authorization header (format: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  // Verify JWT token
  const payload = verifyToken(token);
  if (!payload) {
    throw new ForbiddenError('Invalid or expired token');
  }

  // Fetch user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Attach user to request object
  req.user = user;
  next();
}
