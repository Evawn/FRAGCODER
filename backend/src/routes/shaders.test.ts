// Shader routes integration tests - CRUD operations, authentication, and ownership validation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { clearDatabase, testPrisma } from '../test/testDb';
import { generateToken } from '../utils/jwt';
import type { SaveShaderRequest, UpdateShaderRequest, TabData } from '@fragcoder/shared';

// Mock the slug generator to have predictable slugs in tests
vi.mock('../utils/slugGenerator', () => ({
  generateUniqueSlug: vi.fn(),
}));

import * as slugGenerator from '../utils/slugGenerator';

describe('Shader Routes', () => {
  // Test users
  let user1: { id: string; username: string; email: string; token: string };
  let user2: { id: string; username: string; email: string; token: string };

  // Sample shader data
  const sampleTabs: TabData[] = [
    { id: 'image', name: 'Image', code: 'void mainImage() {}' },
    { id: 'common', name: 'Common', code: '// Common code' },
  ];

  beforeEach(async () => {
    await clearDatabase();
    vi.clearAllMocks();

    // Create test users
    const dbUser1 = await testPrisma.user.create({
      data: {
        googleId: 'google-user-1',
        email: 'user1@example.com',
        username: 'user1',
      },
    });

    const dbUser2 = await testPrisma.user.create({
      data: {
        googleId: 'google-user-2',
        email: 'user2@example.com',
        username: 'user2',
      },
    });

    user1 = {
      id: dbUser1.id,
      username: dbUser1.username,
      email: dbUser1.email,
      token: generateToken(dbUser1.id, dbUser1.email),
    };

    user2 = {
      id: dbUser2.id,
      username: dbUser2.username,
      email: dbUser2.email,
      token: generateToken(dbUser2.id, dbUser2.email),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/shaders', () => {
    describe('List public shaders', () => {
      it('should return empty list when no shaders exist', async () => {
        const response = await request(app).get('/api/shaders');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toEqual([]);
        expect(response.body.total).toBe(0);
        expect(response.body.page).toBe(1);
        expect(response.body.totalPages).toBe(0);
        expect(response.body.limit).toBe(16);
      });

      it('should return list of public shaders', async () => {
        // Create public shader
        await testPrisma.shader.create({
          data: {
            title: 'Public Shader',
            slug: 'pub123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        const response = await request(app).get('/api/shaders');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
        expect(response.body.shaders[0].title).toBe('Public Shader');
        expect(response.body.shaders[0].slug).toBe('pub123');
        expect(response.body.shaders[0].tabs).toEqual(sampleTabs);
        expect(response.body.total).toBe(1);
      });

      it('should exclude private shaders from list', async () => {
        // Create one public and one private shader
        await testPrisma.shader.create({
          data: {
            title: 'Public Shader',
            slug: 'pub123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        await testPrisma.shader.create({
          data: {
            title: 'Private Shader',
            slug: 'priv456',
            tabs: JSON.stringify(sampleTabs),
            isPublic: false,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        const response = await request(app).get('/api/shaders');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
        expect(response.body.shaders[0].title).toBe('Public Shader');
        expect(response.body.total).toBe(1);
      });

    });

    describe('Pagination', () => {
      beforeEach(async () => {
        // Create 25 public shaders
        const shaderPromises = Array.from({ length: 25 }, (_, i) =>
          testPrisma.shader.create({
            data: {
              title: `Shader ${i + 1}`,
              slug: `shader${i + 1}`,
              tabs: JSON.stringify(sampleTabs),
              isPublic: true,
              compilationStatus: 'SUCCESS',
              userId: user1.id,
              lastSavedAt: new Date(),
            },
          })
        );
        await Promise.all(shaderPromises);
      });

      it('should use default pagination (page=1, limit=16)', async () => {
        const response = await request(app).get('/api/shaders');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(16);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(16);
        expect(response.body.total).toBe(25);
        expect(response.body.totalPages).toBe(2);
      });

      it('should support custom page parameter', async () => {
        const response = await request(app).get('/api/shaders?page=2');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(9);
        expect(response.body.page).toBe(2);
        expect(response.body.total).toBe(25);
      });

      it('should support custom limit parameter', async () => {
        const response = await request(app).get('/api/shaders?limit=10');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(10);
        expect(response.body.limit).toBe(10);
        expect(response.body.totalPages).toBe(3);
      });

      it('should support both page and limit parameters', async () => {
        const response = await request(app).get('/api/shaders?page=2&limit=5');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(5);
        expect(response.body.page).toBe(2);
        expect(response.body.limit).toBe(5);
        expect(response.body.totalPages).toBe(5);
      });

      it('should return empty array for page beyond total pages', async () => {
        const response = await request(app).get('/api/shaders?page=10');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(0);
        expect(response.body.page).toBe(10);
        expect(response.body.total).toBe(25);
      });
    });

    describe('Search functionality', () => {
      beforeEach(async () => {
        await testPrisma.shader.create({
          data: {
            title: 'Raymarching Demo',
            description: 'Beautiful raymarched scene',
            slug: 'ray123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        await testPrisma.shader.create({
          data: {
            title: 'Fractal Explorer',
            description: 'Explore fractals in GLSL',
            slug: 'frac123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user2.id,
            lastSavedAt: new Date(),
          },
        });
      });

      it('should search by title', async () => {
        const response = await request(app).get('/api/shaders?search=Raymarching');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
        expect(response.body.shaders[0].title).toBe('Raymarching Demo');
      });

      it('should search by description', async () => {
        const response = await request(app).get('/api/shaders?search=fractals');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
        expect(response.body.shaders[0].title).toBe('Fractal Explorer');
      });

      it('should search by author username', async () => {
        const response = await request(app).get('/api/shaders?search=user2');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
        expect(response.body.shaders[0].user.username).toBe('user2');
      });

      it('should be case-insensitive', async () => {
        const response = await request(app).get('/api/shaders?search=RAYMARCHING');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(1);
      });

      it('should return empty array when no matches', async () => {
        const response = await request(app).get('/api/shaders?search=nonexistent');

        expect(response.status).toBe(200);
        expect(response.body.shaders).toHaveLength(0);
        expect(response.body.total).toBe(0);
      });
    });
  });

  describe('POST /api/shaders', () => {
    const validShaderData: SaveShaderRequest = {
      name: 'My New Shader',
      tabs: sampleTabs,
      isPublic: true,
      compilationStatus: 'SUCCESS',
      description: 'A test shader',
    };

    describe('Successful creation', () => {
      it('should create shader with valid data', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('abc123');

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(validShaderData);

        expect(response.status).toBe(201);
        expect(response.body.shader).toBeDefined();
        expect(response.body.shader.title).toBe('My New Shader');
        expect(response.body.shader.slug).toBe('abc123');
        expect(response.body.shader.tabs).toEqual(sampleTabs);
        expect(response.body.shader.description).toBe('A test shader');
        expect(response.body.shader.isPublic).toBe(true);
        expect(response.body.shader.compilationStatus).toBe('SUCCESS');
        expect(response.body.url).toBe('http://localhost:5173/shader/abc123');
      });


      it('should set default isPublic to true when not provided', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('ghi789');

        const dataWithoutPublic = { ...validShaderData };
        delete dataWithoutPublic.isPublic;

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(dataWithoutPublic);

        expect(response.status).toBe(201);
        expect(response.body.shader.isPublic).toBe(true);
      });

      it('should create private shader when isPublic is false', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('priv123');

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, isPublic: false });

        expect(response.status).toBe(201);
        expect(response.body.shader.isPublic).toBe(false);
      });

      it('should handle all compilation statuses', async () => {
        const statuses: Array<'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING'> = [
          'SUCCESS',
          'ERROR',
          'WARNING',
          'PENDING',
        ];

        for (const status of statuses) {
          vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue(`slug-${status}`);

          const response = await request(app)
            .post('/api/shaders')
            .set('Authorization', `Bearer ${user1.token}`)
            .send({ ...validShaderData, compilationStatus: status });

          expect(response.status).toBe(201);
          expect(response.body.shader.compilationStatus).toBe(status);
        }
      });

      it('should store compilation errors when provided', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('err123');

        const compilationErrors = [
          { line: 5, message: 'Syntax error', type: 'error' as const },
          { line: 10, message: 'Unused variable', type: 'warning' as const },
        ];

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, compilationErrors });

        expect(response.status).toBe(201);
        expect(response.body.shader.compilationErrors).toEqual(compilationErrors);
      });

    });

    describe('Authentication', () => {
      it('should return 401 when no token provided', async () => {
        const response = await request(app)
          .post('/api/shaders')
          .send(validShaderData);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 403 for invalid token', async () => {
        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', 'Bearer invalid-token')
          .send(validShaderData);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when name is missing', async () => {
        const data = { ...validShaderData };
        delete (data as any).name;

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('name');
      });

      it('should return 400 when tabs is missing', async () => {
        const data = { ...validShaderData };
        delete (data as any).tabs;

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tabs');
      });

      it('should return 400 when tabs is not an array', async () => {
        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, tabs: 'not-an-array' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tabs');
      });

      it('should return 400 when tabs array is empty', async () => {
        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, tabs: [] });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tabs');
      });

      it('should return 400 when compilationStatus is missing', async () => {
        const data = { ...validShaderData };
        delete (data as any).compilationStatus;

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('compilation status');
      });

      it('should return 400 for invalid compilationStatus', async () => {
        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, compilationStatus: 'INVALID_STATUS' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('compilation status');
      });

      it('should return 400 when tab is missing required fields', async () => {
        const invalidTabs = [
          { id: 'image', name: 'Image' }, // missing code
        ];

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, tabs: invalidTabs });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tab');
      });

      it('should return 400 when tab has invalid structure', async () => {
        const invalidTabs = [
          { id: 'image', name: 'Image', code: 123 }, // code should be string
        ];

        const response = await request(app)
          .post('/api/shaders')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ ...validShaderData, tabs: invalidTabs });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tab');
      });
    });
  });

  describe('GET /api/shaders/:slug', () => {
    describe('Get public shader', () => {
      it('should return public shader by slug', async () => {
        await testPrisma.shader.create({
          data: {
            title: 'Public Shader',
            slug: 'pub123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        const response = await request(app).get('/api/shaders/pub123');

        expect(response.status).toBe(200);
        expect(response.body.shader).toBeDefined();
        expect(response.body.shader.title).toBe('Public Shader');
        expect(response.body.shader.slug).toBe('pub123');
        expect(response.body.shader.tabs).toEqual(sampleTabs);
      });

      it('should return shader with all fields', async () => {
        const compilationErrors = [
          { line: 5, message: 'Test error', type: 'error' as const },
        ];

        await testPrisma.shader.create({
          data: {
            title: 'Full Shader',
            slug: 'full123',
            description: 'Complete shader',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'ERROR',
            compilationErrors: JSON.stringify(compilationErrors),
            userId: user1.id,
            forkedFrom: 'original123',
            lastSavedAt: new Date(),
          },
        });

        const response = await request(app).get('/api/shaders/full123');

        expect(response.status).toBe(200);
        expect(response.body.shader.description).toBe('Complete shader');
        expect(response.body.shader.compilationStatus).toBe('ERROR');
        expect(response.body.shader.compilationErrors).toEqual(compilationErrors);
        expect(response.body.shader.forkedFrom).toBe('original123');
        expect(response.body.shader.user).toEqual({
          id: user1.id,
          username: user1.username,
        });
      });

      it('should return 404 for non-existent shader', async () => {
        const response = await request(app).get('/api/shaders/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Shader');
      });
    });

    describe('Private shader access', () => {
      beforeEach(async () => {
        await testPrisma.shader.create({
          data: {
            title: 'Private Shader',
            slug: 'priv123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: false,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });
      });

      it('should return 403 for private shader without authentication', async () => {
        const response = await request(app).get('/api/shaders/priv123');

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('private');
      });

      it('should allow owner to access their private shader', async () => {
        const response = await request(app)
          .get('/api/shaders/priv123')
          .set('Authorization', `Bearer ${user1.token}`);

        expect(response.status).toBe(200);
        expect(response.body.shader.title).toBe('Private Shader');
      });

      it('should return 403 when non-owner tries to access private shader', async () => {
        const response = await request(app)
          .get('/api/shaders/priv123')
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('private');
      });

      it('should return 403 for invalid token on private shader', async () => {
        const response = await request(app)
          .get('/api/shaders/priv123')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('private');
      });
    });
  });

  describe('PUT /api/shaders/:slug', () => {
    let shaderSlug: string;

    beforeEach(async () => {
      shaderSlug = 'update123';
      await testPrisma.shader.create({
        data: {
          title: 'Original Title',
          slug: shaderSlug,
          tabs: JSON.stringify(sampleTabs),
          isPublic: true,
          compilationStatus: 'SUCCESS',
          userId: user1.id,
          lastSavedAt: new Date(),
        },
      });
    });

    describe('Successful update', () => {
      const updateData: UpdateShaderRequest = {
        name: 'Updated Title',
        tabs: [
          { id: 'image', name: 'Image', code: 'void mainImage() { /* updated */ }' },
        ],
        compilationStatus: 'WARNING',
      };

      it('should update shader with valid data', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.shader.title).toBe('Updated Title');
        expect(response.body.shader.tabs).toEqual(updateData.tabs);
        expect(response.body.shader.compilationStatus).toBe('WARNING');
      });


      it('should update lastSavedAt timestamp', async () => {
        const before = new Date();

        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send(updateData);

        const lastSavedAt = new Date(response.body.shader.lastSavedAt);
        expect(lastSavedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });
    });

    describe('Authentication and ownership', () => {
      const updateData: UpdateShaderRequest = {
        name: 'Updated',
        tabs: sampleTabs,
        compilationStatus: 'SUCCESS',
      };

      it('should return 401 when no token provided', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .send(updateData);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 403 when token is invalid', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', 'Bearer invalid-token')
          .send(updateData);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should return 403 when user is not the owner', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user2.token}`)
          .send(updateData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permission');
      });

      it('should return 404 for non-existent shader', async () => {
        const response = await request(app)
          .put('/api/shaders/nonexistent')
          .set('Authorization', `Bearer ${user1.token}`)
          .send(updateData);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Shader');
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when name is missing', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            tabs: sampleTabs,
            compilationStatus: 'SUCCESS',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('name');
      });

      it('should return 400 when tabs is missing', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            compilationStatus: 'SUCCESS',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tabs');
      });

      it('should return 400 when compilationStatus is missing', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            tabs: sampleTabs,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('compilationStatus');
      });

      it('should return 400 when tabs is not an array', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            tabs: 'not-an-array',
            compilationStatus: 'SUCCESS',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('array');
      });

      it('should return 400 when tabs array is empty', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            tabs: [],
            compilationStatus: 'SUCCESS',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('non-empty');
      });

      it('should return 400 for invalid compilationStatus', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            tabs: sampleTabs,
            compilationStatus: 'INVALID',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('compilation status');
      });

      it('should return 400 when tab structure is invalid', async () => {
        const response = await request(app)
          .put(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({
            name: 'Updated',
            tabs: [{ id: 'image' }], // missing name and code
            compilationStatus: 'SUCCESS',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tab');
      });
    });
  });

  describe('DELETE /api/shaders/:slug', () => {
    let shaderSlug: string;

    beforeEach(async () => {
      shaderSlug = 'delete123';
      await testPrisma.shader.create({
        data: {
          title: 'To Delete',
          slug: shaderSlug,
          tabs: JSON.stringify(sampleTabs),
          isPublic: true,
          compilationStatus: 'SUCCESS',
          userId: user1.id,
          lastSavedAt: new Date(),
        },
      });
    });

    describe('Successful deletion', () => {
      it('should delete shader with valid ownership', async () => {
        const response = await request(app)
          .delete(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');
      });


      it('should not affect other shaders', async () => {
        await testPrisma.shader.create({
          data: {
            title: 'Keep This',
            slug: 'keep123',
            tabs: JSON.stringify(sampleTabs),
            isPublic: true,
            compilationStatus: 'SUCCESS',
            userId: user1.id,
            lastSavedAt: new Date(),
          },
        });

        await request(app)
          .delete(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user1.token}`);

        const remainingShader = await testPrisma.shader.findUnique({
          where: { slug: 'keep123' },
        });

        expect(remainingShader).not.toBeNull();
      });
    });

    describe('Authentication and ownership', () => {
      it('should return 401 when no token provided', async () => {
        const response = await request(app).delete(`/api/shaders/${shaderSlug}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 403 for invalid token', async () => {
        const response = await request(app)
          .delete(`/api/shaders/${shaderSlug}`)
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });

      it('should return 403 when user is not the owner', async () => {
        const response = await request(app)
          .delete(`/api/shaders/${shaderSlug}`)
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permission');
      });

      it('should return 404 for non-existent shader', async () => {
        const response = await request(app)
          .delete('/api/shaders/nonexistent')
          .set('Authorization', `Bearer ${user1.token}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Shader');
      });

    });
  });

  describe('POST /api/shaders/:slug/clone', () => {
    let publicShaderSlug: string;
    let privateShaderSlug: string;

    beforeEach(async () => {
      publicShaderSlug = 'public123';
      privateShaderSlug = 'private123';

      await testPrisma.shader.create({
        data: {
          title: 'Public Shader',
          slug: publicShaderSlug,
          description: 'Public shader for cloning',
          tabs: JSON.stringify(sampleTabs),
          isPublic: true,
          compilationStatus: 'SUCCESS',
          userId: user1.id,
          lastSavedAt: new Date(),
        },
      });

      await testPrisma.shader.create({
        data: {
          title: 'Private Shader',
          slug: privateShaderSlug,
          tabs: JSON.stringify(sampleTabs),
          isPublic: false,
          compilationStatus: 'SUCCESS',
          userId: user1.id,
          lastSavedAt: new Date(),
        },
      });
    });

    describe('Successful cloning', () => {
      it('should clone public shader', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('clone123');

        const response = await request(app)
          .post(`/api/shaders/${publicShaderSlug}/clone`)
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(201);
        expect(response.body.shader).toBeDefined();
        expect(response.body.shader.title).toBe('Public Shader (Clone)');
        expect(response.body.shader.slug).toBe('clone123');
        expect(response.body.shader.forkedFrom).toBe(publicShaderSlug);
        expect(response.body.shader.userId).toBe(user2.id);
        expect(response.body.url).toBe('http://localhost:5173/shader/clone123');
      });


      it('should copy all shader data to clone', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('fullclone');

        const response = await request(app)
          .post(`/api/shaders/${publicShaderSlug}/clone`)
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(201);
        expect(response.body.shader.tabs).toEqual(sampleTabs);
        expect(response.body.shader.description).toBe('Public shader for cloning');
        expect(response.body.shader.compilationStatus).toBe('SUCCESS');
      });

      it('should allow owner to clone their own private shader', async () => {
        vi.mocked(slugGenerator.generateUniqueSlug).mockResolvedValue('ownclone');

        const response = await request(app)
          .post(`/api/shaders/${privateShaderSlug}/clone`)
          .set('Authorization', `Bearer ${user1.token}`);

        expect(response.status).toBe(201);
        expect(response.body.shader.title).toBe('Private Shader (Clone)');
        expect(response.body.shader.userId).toBe(user1.id);
      });

    });

    describe('Authentication', () => {
      it('should return 401 when no token provided', async () => {
        const response = await request(app).post(`/api/shaders/${publicShaderSlug}/clone`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
      });

      it('should return 403 for invalid token', async () => {
        const response = await request(app)
          .post(`/api/shaders/${publicShaderSlug}/clone`)
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid or expired token');
      });
    });

    describe('Private shader cloning', () => {
      it('should return 403 when trying to clone someone else\'s private shader', async () => {
        const response = await request(app)
          .post(`/api/shaders/${privateShaderSlug}/clone`)
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('private');
      });

    });

    describe('Error cases', () => {
      it('should return 404 for non-existent shader', async () => {
        const response = await request(app)
          .post('/api/shaders/nonexistent/clone')
          .set('Authorization', `Bearer ${user1.token}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Shader');
      });

    });
  });
});
