import express from 'express';
import { PrismaClient, CompilationStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { generateUniqueSlug } from '../utils/slugGenerator';

const router = express.Router();
const prisma = new PrismaClient();

interface TabData {
  id: string;
  name: string;
  code: string;
}

interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
  passName?: string;
}

interface SaveShaderRequest {
  name: string;
  tabs: TabData[];
  isPublic?: boolean;
  compilationStatus: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';
  compilationErrors?: CompilationError[];
  description?: string;
}

interface UpdateShaderRequest {
  name: string;
  tabs: TabData[];
  compilationStatus: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';
}

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
router.post('/', authenticateToken, async (req, res): Promise<any> => {
  try {
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
      return res.status(400).json({
        error: 'Missing required fields: name and tabs array are required',
      });
    }

    // Validate compilation status
    const validStatuses: CompilationStatus[] = [
      'SUCCESS',
      'ERROR',
      'WARNING',
      'PENDING',
    ];
    if (!compilationStatus || !validStatuses.includes(compilationStatus as CompilationStatus)) {
      return res.status(400).json({
        error: 'Invalid compilation status. Must be SUCCESS, ERROR, WARNING, or PENDING',
      });
    }

    // Validate tabs structure
    for (const tab of tabs) {
      if (!tab.id || !tab.name || typeof tab.code !== 'string') {
        return res.status(400).json({
          error: 'Invalid tab structure. Each tab must have id, name, and code',
        });
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
  } catch (error) {
    console.error('Error creating shader:', error);
    res.status(500).json({ error: 'Failed to create shader' });
  }
});

/**
 * GET /api/shaders/:slug
 * Get shader by slug
 *
 * Response: { shader: Shader }
 */
router.get('/:slug', async (req, res): Promise<any> => {
  try {
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
      return res.status(404).json({ error: 'Shader not found' });
    }

    // Check if shader is public or user has access
    if (!shader.isPublic) {
      // TODO: Implement proper authorization check
      return res.status(403).json({ error: 'This shader is private' });
    }

    res.json({
      shader: {
        ...shader,
        tabs: JSON.parse(shader.tabs),
        compilationErrors: shader.compilationErrors
          ? JSON.parse(shader.compilationErrors)
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching shader:', error);
    res.status(500).json({ error: 'Failed to fetch shader' });
  }
});

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
router.put('/:slug', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { slug } = req.params;
    const {
      name,
      tabs,
      compilationStatus,
    } = req.body as UpdateShaderRequest;

    // Validate required fields
    if (!name || !tabs || !compilationStatus) {
      return res.status(400).json({
        error: 'Missing required fields: name, tabs, and compilationStatus are required',
      });
    }

    // Find shader
    const existingShader = await prisma.shader.findUnique({
      where: { slug },
      select: { id: true, userId: true }
    });

    if (!existingShader) {
      return res.status(404).json({ error: 'Shader not found' });
    }

    // Check ownership
    if (existingShader.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have permission to update this shader' });
    }

    // Validate tabs
    if (!Array.isArray(tabs) || tabs.length === 0) {
      return res.status(400).json({ error: 'Tabs must be a non-empty array' });
    }

    for (const tab of tabs) {
      if (!tab.id || !tab.name || typeof tab.code !== 'string') {
        return res.status(400).json({
          error: 'Invalid tab structure. Each tab must have id, name, and code',
        });
      }
    }

    // Validate compilation status
    const validStatuses: CompilationStatus[] = ['SUCCESS', 'ERROR', 'WARNING', 'PENDING'];
    if (!validStatuses.includes(compilationStatus as CompilationStatus)) {
      return res.status(400).json({
        error: 'Invalid compilation status. Must be SUCCESS, ERROR, WARNING, or PENDING',
      });
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
  } catch (error) {
    console.error('Error updating shader:', error);
    res.status(500).json({ error: 'Failed to update shader' });
  }
});

/**
 * DELETE /api/shaders/:slug
 * Delete an existing shader
 *
 * Requires: Authorization: Bearer <token>
 * Response: { message: string }
 */
router.delete('/:slug', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { slug } = req.params;

    // Find shader
    const existingShader = await prisma.shader.findUnique({
      where: { slug },
      select: { id: true, userId: true, title: true }
    });

    if (!existingShader) {
      return res.status(404).json({ error: 'Shader not found' });
    }

    // Check ownership
    if (existingShader.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this shader' });
    }

    // Delete shader from database
    await prisma.shader.delete({
      where: { slug }
    });

    res.json({ message: 'Shader deleted successfully' });
  } catch (error) {
    console.error('Error deleting shader:', error);
    res.status(500).json({ error: 'Failed to delete shader' });
  }
});

export default router;
