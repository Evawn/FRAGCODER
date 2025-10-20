/**
 * Shader Service
 * Business logic layer for shader operations including CRUD, search, and cloning.
 * Separates business logic from HTTP layer for better testability and maintainability.
 */

import { CompilationStatus } from '@prisma/client';
import type { UpdateShaderRequest, TabData, CompilationError } from '@fragcoder/shared';
import { prisma } from '../db';
import { generateUniqueSlug } from '../utils/slugGenerator';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';

// ============ TYPES ============

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

interface PaginatedShaderResult {
  shaders: any[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface ShaderData {
  name: string;
  tabs: TabData[];
  isPublic?: boolean;
  compilationStatus: CompilationStatus;
  compilationErrors?: CompilationError[];
  description?: string;
}

// ============ PUBLIC SHADER LISTING ============

/**
 * Get all public shaders with search and pagination
 */
export async function listPublicShaders(params: PaginationParams): Promise<PaginatedShaderResult> {
  const { page, limit, search = '' } = params;

  // Build where clause with search filtering
  // Only public shaders are shown in the gallery
  const where: any = {
    isPublic: true
  };

  // Search across title, description, and author username
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { user: { username: { contains: search } } }
    ];
  }

  // Execute queries in parallel for better performance
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

  // Parse tabs JSON for each shader (stored as JSON string in database)
  const parsedShaders = shaders.map(shader => ({
    ...shader,
    tabs: JSON.parse(shader.tabs)
  }));

  return {
    shaders: parsedShaders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit
  };
}

// ============ SHADER CREATION ============

/**
 * Create a new shader
 */
export async function createShader(userId: string, data: ShaderData) {
  const {
    name,
    tabs,
    isPublic = true,
    compilationStatus,
    compilationErrors,
    description,
  } = data;

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

  // Validate tabs structure (ensure each tab has required fields)
  for (const tab of tabs) {
    if (!tab.id || !tab.name || typeof tab.code !== 'string') {
      throw new ValidationError('Invalid tab structure. Each tab must have id, name, and code');
    }
  }

  // Generate unique slug for URL (e.g., "colorful-unicorn-42")
  const slug = await generateUniqueSlug();

  // Create shader in database with all metadata
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
      userId,
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

  // Parse JSON fields for response
  return {
    ...shader,
    tabs: JSON.parse(shader.tabs),
    compilationErrors: shader.compilationErrors
      ? JSON.parse(shader.compilationErrors)
      : null,
  };
}

// ============ SHADER RETRIEVAL ============

/**
 * Get shader by slug with access control
 * Private shaders are only accessible to their owner
 */
export async function getShaderBySlug(slug: string, userId?: string) {
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
  // Private shaders are only accessible to their owner
  if (!shader.isPublic) {
    if (!userId || userId !== shader.userId) {
      throw new ForbiddenError('This shader is private');
    }
  }

  // Parse JSON fields for response
  return {
    ...shader,
    tabs: JSON.parse(shader.tabs),
    compilationErrors: shader.compilationErrors
      ? JSON.parse(shader.compilationErrors)
      : null,
  };
}

// ============ SHADER UPDATES ============

/**
 * Update an existing shader
 * Only the owner can update their shader
 */
export async function updateShader(slug: string, userId: string, data: UpdateShaderRequest) {
  const { name, tabs, compilationStatus } = data;

  // Validate required fields
  if (!name || !tabs || !compilationStatus) {
    throw new ValidationError('Missing required fields: name, tabs, and compilationStatus are required');
  }

  // Find shader and check ownership
  const existingShader = await prisma.shader.findUnique({
    where: { slug },
    select: { id: true, userId: true }
  });

  if (!existingShader) {
    throw new NotFoundError('Shader');
  }

  // Check ownership - users can only update their own shaders
  if (existingShader.userId !== userId) {
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

  // Parse JSON fields for response
  return {
    ...shader,
    tabs: JSON.parse(shader.tabs),
    compilationErrors: shader.compilationErrors
      ? JSON.parse(shader.compilationErrors)
      : null,
  };
}

// ============ SHADER DELETION ============

/**
 * Delete an existing shader
 * Only the owner can delete their shader
 */
export async function deleteShader(slug: string, userId: string): Promise<void> {
  // Find shader and check ownership
  const existingShader = await prisma.shader.findUnique({
    where: { slug },
    select: { id: true, userId: true, title: true }
  });

  if (!existingShader) {
    throw new NotFoundError('Shader');
  }

  // Check ownership - users can only delete their own shaders
  if (existingShader.userId !== userId) {
    throw new ForbiddenError('You do not have permission to delete this shader');
  }

  // Delete shader from database (permanent deletion, no soft delete)
  await prisma.shader.delete({
    where: { slug }
  });
}

// ============ SHADER CLONING ============

/**
 * Clone an existing shader (fork functionality)
 * Users can clone public shaders or their own private shaders
 */
export async function cloneShader(slug: string, userId: string) {
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
  // Users can clone their own private shaders or any public shader
  if (!originalShader.isPublic && originalShader.userId !== userId) {
    throw new ForbiddenError('This shader is private and cannot be cloned');
  }

  // Generate unique slug for the cloned shader
  const newSlug = await generateUniqueSlug();

  // Create the cloned shader with reference to original (forkedFrom)
  const clonedShader = await prisma.shader.create({
    data: {
      title: `${originalShader.title} (Clone)`,
      slug: newSlug,
      tabs: originalShader.tabs,
      description: originalShader.description,
      isPublic: originalShader.isPublic,
      compilationStatus: originalShader.compilationStatus,
      compilationErrors: originalShader.compilationErrors,
      userId,  // Cloned shader belongs to the current user
      forkedFrom: originalShader.slug,  // Track shader genealogy
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

  // Parse JSON fields for response
  return {
    ...clonedShader,
    tabs: JSON.parse(clonedShader.tabs),
    compilationErrors: clonedShader.compilationErrors
      ? JSON.parse(clonedShader.compilationErrors)
      : null,
  };
}
