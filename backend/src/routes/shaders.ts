/**
 * Shader Routes
 * Thin controller layer that handles HTTP requests and delegates business logic to the shader service
 */

import express from 'express';
import type { SaveShaderRequest, UpdateShaderRequest } from '@fragcoder/shared';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as shaderService from '../services/shaderService';

const router = express.Router();

// ============ PUBLIC SHADER LISTING ============

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
  // Parse query parameters with defaults
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 16;
  const search = (req.query.search as string) || '';

  const result = await shaderService.listPublicShaders({ page, limit, search });
  res.json(result);
}));

// ============ SHADER CREATION ============

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
  const data = req.body as SaveShaderRequest;
  const shader = await shaderService.createShader(req.user!.id, data);

  // Construct full URL for client (used for sharing/copying)
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const shaderUrl = `${baseUrl}/shader/${shader.slug}`;

  res.status(201).json({ shader, url: shaderUrl });
}));

// ============ SHADER RETRIEVAL ============

/**
 * GET /api/shaders/:slug
 * Get shader by slug
 *
 * Response: { shader: Shader }
 */
router.get('/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Get user ID from token if available (optional authentication for this endpoint)
  let userId: string | undefined;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const { verifyToken } = await import('../utils/jwt');
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
    }
  }

  const shader = await shaderService.getShaderBySlug(slug, userId);
  res.json({ shader });
}));

// ============ SHADER UPDATES ============

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
  const data = req.body as UpdateShaderRequest;

  const shader = await shaderService.updateShader(slug, req.user!.id, data);
  res.json({ shader });
}));

// ============ SHADER DELETION ============

/**
 * DELETE /api/shaders/:slug
 * Delete an existing shader
 *
 * Requires: Authorization: Bearer <token>
 * Response: { message: string }
 */
router.delete('/:slug', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const { slug } = req.params;

  await shaderService.deleteShader(slug, req.user!.id);
  res.json({ message: 'Shader deleted successfully' });
}));

// ============ SHADER CLONING ============

/**
 * POST /api/shaders/:slug/clone
 * Clone an existing shader (fork functionality)
 *
 * Requires: Authorization: Bearer <token>
 * Response: { shader: Shader, url: string }
 */
router.post('/:slug/clone', asyncHandler(authenticateToken), asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const shader = await shaderService.cloneShader(slug, req.user!.id);

  // Construct full URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const shaderUrl = `${baseUrl}/shader/${shader.slug}`;

  res.status(201).json({ shader, url: shaderUrl });
}));

export default router;
