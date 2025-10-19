import express from 'express';
import { CompilationStatus } from '@prisma/client';
import type {
  SaveShaderRequest,
  UpdateShaderRequest,
} from '@fragcoder/shared';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { generateUniqueSlug } from '../utils/slugGenerator';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';

const router = express.Router();

/**
 * GET /api/shaders
 * Get all public shaders with search and pagination
 *
 * Query parameters:
 *   - page (number): Current page number (default: 1)
 *   - limit (number): Results per page (default: 16)
 *   - search (string): Search term for title, description, or author username
 *
 * Response: {
 *   shaders: Shader[],
 *   total: number,
 *   page: number,
 *   totalPages: number,
 *   limit: number
 * }
 */
router.get('/', asyncHandler(async (req, res) => {
  // Parse query parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 16;
  const search = (req.query.search as string) || '';

  // Build where clause with search filtering
  const where: any = {
    isPublic: true
  };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { user: { username: { contains: search } } }
    ];
  }

  // Execute queries in parallel
  const [shaders, total] = await Promise.all([
    prisma.shader.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        tabs: true,  // Include shader code for client-side thumbnail generation
        userId: true,
        forkedFrom: true,
        createdAt: true,
        updatedAt: true,
        isPublic: true,
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.shader.count({ where })
  ]);

  // Parse tabs JSON for each shader
  const parsedShaders = shaders.map(shader => ({
    ...shader,
    tabs: JSON.parse(shader.tabs)
  }));

  // Return paginated response
  res.json({
    shaders: parsedShaders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit
  });
}));

/**
 * POST /api/shaders
 * Create a new shader
 *
 * Requires: Authorization: Bearer <token>
 * Request body: {
 *   name: string,
 *   tabs: TabData[],
 *   isPublic?: boolean,
 *   compilationStatus: CompilationStatus,
 *   compilationErrors?: CompilationError[],
 *   description?: string
 * }
 * Response: { shader: Shader, url: string }
 */
router.post('/', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const {
    name,
    tabs,
    isPublic = true,
    compilationStatus,
    compilationErrors,
    description,
  } = req.body as SaveShaderRequest;

  // Validate required fields
  if (!name || !tabs || !Array.isArray(tabs) || tabs.length === 0) {
    throw new ValidationError('Missing required fields: name and tabs array are required');
  }

  // Validate compilation status
  const validStatuses: CompilationStatus[] = [
    'SUCCESS',
    'ERROR',
    'WARNING',
    'PENDING',
  ];
  if (!compilationStatus || !validStatuses.includes(compilationStatus as CompilationStatus)) {
    throw new ValidationError('Invalid compilation status. Must be SUCCESS, ERROR, WARNING, or PENDING');
  }

  // Validate tabs structure
  for (const tab of tabs) {
    if (!tab.id || !tab.name || typeof tab.code !== 'string') {
      throw new ValidationError('Invalid tab structure. Each tab must have id, name, and code');
    }
  }

  // Generate unique slug for URL
  const slug = await generateUniqueSlug();

  // Create shader in database
  const shader = await prisma.shader.create({
    data: {
      title: name,
      slug,
      tabs: JSON.stringify(tabs),
      isPublic,
      compilationStatus: compilationStatus as CompilationStatus,
      compilationErrors: compilationErrors
        ? JSON.stringify(compilationErrors)
        : null,
      description: description || null,
      userId: req.user!.id,
      lastSavedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      tabs: true,
      description: true,
      isPublic: true,
      compilationStatus: true,
      compilationErrors: true,
      userId: true,
      forkedFrom: true,
      createdAt: true,
      updatedAt: true,
      lastSavedAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  // Construct full URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const shaderUrl = `${baseUrl}/shader/${slug}`;

  res.status(201).json({
    shader: {
      ...shader,
      tabs: JSON.parse(shader.tabs),
      compilationErrors: shader.compilationErrors
        ? JSON.parse(shader.compilationErrors)
        : null,
    },
    url: shaderUrl,
  });
}));

/**
 * GET /api/shaders/:slug
 * Get shader by slug
 *
 * Response: { shader: Shader }
 */
router.get('/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const shader = await prisma.shader.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      tabs: true,
      description: true,
      isPublic: true,
      compilationStatus: true,
      compilationErrors: true,
      userId: true,
      forkedFrom: true,
      createdAt: true,
      updatedAt: true,
      lastSavedAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!shader) {
    throw new NotFoundError('Shader');
  }

  // Check if shader is public or user has access
  if (!shader.isPublic) {
    // Get user from token if available (optional authentication)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { verifyToken } = await import('../utils/jwt');
      const payload = verifyToken(token);

      // Allow access if user is the owner
      if (payload && payload.userId === shader.userId) {
        return res.json({
          shader: {
            ...shader,
            tabs: JSON.parse(shader.tabs),
            compilationErrors: shader.compilationErrors
              ? JSON.parse(shader.compilationErrors)
              : null,
          },
        });
      }
    }

    throw new ForbiddenError('This shader is private');
  }

  return res.json({
    shader: {
      ...shader,
      tabs: JSON.parse(shader.tabs),
      compilationErrors: shader.compilationErrors
        ? JSON.parse(shader.compilationErrors)
        : null,
    },
  });
}));

/**
 * PUT /api/shaders/:slug
 * Update an existing shader
 *
 * Requires: Authorization: Bearer <token>
 * Request body: {
 *   name: string,
 *   tabs: TabData[],
 *   compilationStatus: CompilationStatus
 * }
 * Response: { shader: Shader }
 */
router.put('/:slug', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    name,
    tabs,
    compilationStatus,
  } = req.body as UpdateShaderRequest;

  // Validate required fields
  if (!name || !tabs || !compilationStatus) {
    throw new ValidationError('Missing required fields: name, tabs, and compilationStatus are required');
  }

  // Find shader
  const existingShader = await prisma.shader.findUnique({
    where: { slug },
    select: { id: true, userId: true }
  });

  if (!existingShader) {
    throw new NotFoundError('Shader');
  }

  // Check ownership
  if (existingShader.userId !== req.user!.id) {
    throw new ForbiddenError('You do not have permission to update this shader');
  }

  // Validate tabs
  if (!Array.isArray(tabs) || tabs.length === 0) {
    throw new ValidationError('Tabs must be a non-empty array');
  }

  for (const tab of tabs) {
    if (!tab.id || !tab.name || typeof tab.code !== 'string') {
      throw new ValidationError('Invalid tab structure. Each tab must have id, name, and code');
    }
  }

  // Validate compilation status
  const validStatuses: CompilationStatus[] = ['SUCCESS', 'ERROR', 'WARNING', 'PENDING'];
  if (!validStatuses.includes(compilationStatus as CompilationStatus)) {
    throw new ValidationError('Invalid compilation status. Must be SUCCESS, ERROR, WARNING, or PENDING');
  }

  // Update shader in database
  const shader = await prisma.shader.update({
    where: { slug },
    data: {
      title: name,
      tabs: JSON.stringify(tabs),
      compilationStatus: compilationStatus as CompilationStatus,
      lastSavedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      tabs: true,
      description: true,
      isPublic: true,
      compilationStatus: true,
      compilationErrors: true,
      userId: true,
      forkedFrom: true,
      createdAt: true,
      updatedAt: true,
      lastSavedAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  res.json({
    shader: {
      ...shader,
      tabs: JSON.parse(shader.tabs),
      compilationErrors: shader.compilationErrors
        ? JSON.parse(shader.compilationErrors)
        : null,
    },
  });
}));

/**
 * DELETE /api/shaders/:slug
 * Delete an existing shader
 *
 * Requires: Authorization: Bearer <token>
 * Response: { message: string }
 */
router.delete('/:slug', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Find shader
  const existingShader = await prisma.shader.findUnique({
    where: { slug },
    select: { id: true, userId: true, title: true }
  });

  if (!existingShader) {
    throw new NotFoundError('Shader');
  }

  // Check ownership
  if (existingShader.userId !== req.user!.id) {
    throw new ForbiddenError('You do not have permission to delete this shader');
  }

  // Delete shader from database
  await prisma.shader.delete({
    where: { slug }
  });

  res.json({ message: 'Shader deleted successfully' });
}));

/**
 * POST /api/shaders/:slug/clone
 * Clone an existing shader
 *
 * Requires: Authorization: Bearer <token>
 * Response: { shader: Shader, url: string }
 */
router.post('/:slug/clone', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Find the original shader
  const originalShader = await prisma.shader.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      tabs: true,
      description: true,
      isPublic: true,
      compilationStatus: true,
      compilationErrors: true,
      userId: true,
    }
  });

  if (!originalShader) {
    throw new NotFoundError('Shader');
  }

  // Check if shader is public or user is the owner
  if (!originalShader.isPublic && originalShader.userId !== req.user!.id) {
    throw new ForbiddenError('This shader is private and cannot be cloned');
  }

  // Generate unique slug for the cloned shader
  const newSlug = await generateUniqueSlug();

  // Create the cloned shader
  const clonedShader = await prisma.shader.create({
    data: {
      title: `${originalShader.title} (Clone)`,
      slug: newSlug,
      tabs: originalShader.tabs,
      description: originalShader.description,
      isPublic: originalShader.isPublic,
      compilationStatus: originalShader.compilationStatus,
      compilationErrors: originalShader.compilationErrors,
      userId: req.user!.id,
      forkedFrom: originalShader.slug,
      lastSavedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      tabs: true,
      description: true,
      isPublic: true,
      compilationStatus: true,
      compilationErrors: true,
      userId: true,
      forkedFrom: true,
      createdAt: true,
      updatedAt: true,
      lastSavedAt: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  // Construct full URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const shaderUrl = `${baseUrl}/shader/${newSlug}`;

  res.status(201).json({
    shader: {
      ...clonedShader,
      tabs: JSON.parse(clonedShader.tabs),
      compilationErrors: clonedShader.compilationErrors
        ? JSON.parse(clonedShader.compilationErrors)
        : null,
    },
    url: shaderUrl,
  });
}));

export default router;
