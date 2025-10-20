// Slug generator tests - unique slug creation, collision handling, and retry logic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateUniqueSlug } from './slugGenerator';
import { prisma } from '../db';

// Mock the Prisma client
vi.mock('../db', () => ({
  prisma: {
    shader: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Slug Generator', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateUniqueSlug - Basic Functionality', () => {
    it('should generate a slug with default 6 characters', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(slug.length).toBe(6);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should generate slug with custom preferred length', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug(8);

      expect(slug.length).toBe(8);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateUniqueSlug - Collision Handling', () => {
    it('should retry when slug already exists', async () => {
      vi.mocked(prisma.shader.findUnique)
        .mockResolvedValueOnce({ id: 'existing-id' } as any)
        .mockResolvedValueOnce(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple collisions before finding unique slug', async () => {
      vi.mocked(prisma.shader.findUnique)
        .mockResolvedValueOnce({ id: 'id1' } as any)
        .mockResolvedValueOnce({ id: 'id2' } as any)
        .mockResolvedValueOnce({ id: 'id3' } as any)
        .mockResolvedValueOnce(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(4);
    });
  });

  describe('generateUniqueSlug - Length Increase After 5 Collisions', () => {
    it('should increase slug length after 5 collision attempts', async () => {
      const generatedSlugs: string[] = [];

      // @ts-expect-error - Mock implementation doesn't need full Prisma client type
      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        if (generatedSlugs.length <= 5) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      await generateUniqueSlug(6);

      expect(generatedSlugs[0].length).toBe(6);
      expect(generatedSlugs[4].length).toBe(6);
      expect(generatedSlugs[5].length).toBe(7); // Increased after 5 collisions
    });

    it('should cap length increase at 8 characters', async () => {
      const generatedSlugs: string[] = [];

      // @ts-expect-error - Mock implementation doesn't need full Prisma client type
      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        if (generatedSlugs.length <= 9) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      await generateUniqueSlug(6, 10);

      expect(generatedSlugs[5].length).toBe(7);
      expect(generatedSlugs[6].length).toBe(8);
      expect(generatedSlugs[7].length).toBe(8); // Stays at 8
      expect(generatedSlugs[9].length).toBe(8);
    });
  });

  describe('generateUniqueSlug - Max Retry Failure', () => {
    it('should throw error after max retries with persistent collisions', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue({ id: 'collision' } as any);

      await expect(generateUniqueSlug(6, 10)).rejects.toThrow(
        'Failed to generate unique slug after 10 attempts'
      );

      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(10);
    });

    it('should succeed on last possible retry', async () => {
      const maxRetries = 5;

      // @ts-expect-error - Mock implementation doesn't need full Prisma client type
      vi.mocked(prisma.shader.findUnique).mockImplementation(async () => {
        const callCount = vi.mocked(prisma.shader.findUnique).mock.calls.length;

        if (callCount < maxRetries) {
          return { id: 'collision' } as any;
        }
        return null;
      });

      const slug = await generateUniqueSlug(6, maxRetries);

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(maxRetries);
    });
  });

});
