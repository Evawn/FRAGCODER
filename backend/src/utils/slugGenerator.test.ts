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
      // Mock no collision - slug is unique
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(slug.length).toBe(6);
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should generate slug with only alphanumeric characters', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      // Should only contain letters and numbers
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate slug with custom preferred length', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug(8);

      expect(slug.length).toBe(8);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should query database with correct parameters', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      expect(prisma.shader.findUnique).toHaveBeenCalledWith({
        where: { slug },
        select: { id: true },
      });
    });

    it('should return slug when no collision exists', async () => {
      // Mock successful unique slug generation
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(typeof slug).toBe('string');
    });
  });

  describe('generateUniqueSlug - Collision Handling', () => {
    it('should retry when slug already exists', async () => {
      // First attempt: collision (slug exists)
      // Second attempt: success (slug is unique)
      vi.mocked(prisma.shader.findUnique)
        .mockResolvedValueOnce({ id: 'existing-id' } as any)
        .mockResolvedValueOnce(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should generate different slug on retry after collision', async () => {
      const generatedSlugs: string[] = [];

      // Capture the slug being checked each time
      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        // First slug collides, second one is unique
        if (generatedSlugs.length === 1) {
          return { id: 'existing-id' } as any;
        }
        return null;
      });

      const slug = await generateUniqueSlug();

      expect(generatedSlugs.length).toBe(2);
      expect(generatedSlugs[0]).not.toBe(generatedSlugs[1]); // Different slugs generated
      expect(slug).toBe(generatedSlugs[1]); // Returns the unique one
    });

    it('should handle multiple collisions before finding unique slug', async () => {
      // 3 collisions, then success
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

      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        // First 5 attempts: collision (all 6 chars)
        // 6th attempt: success (should be 7 chars)
        if (generatedSlugs.length <= 5) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      const slug = await generateUniqueSlug(6);

      // First 5 slugs should be 6 characters
      expect(generatedSlugs[0].length).toBe(6);
      expect(generatedSlugs[1].length).toBe(6);
      expect(generatedSlugs[2].length).toBe(6);
      expect(generatedSlugs[3].length).toBe(6);
      expect(generatedSlugs[4].length).toBe(6);

      // 6th slug should be 7 characters (length increased)
      expect(generatedSlugs[5].length).toBe(7);
      expect(slug).toBe(generatedSlugs[5]);
    });

    it('should increase length only up to 8 characters', async () => {
      const generatedSlugs: string[] = [];

      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        // First 9 attempts: collision
        // 10th attempt: success
        if (generatedSlugs.length <= 9) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      const slug = await generateUniqueSlug(6, 10);

      // After 5 collisions: length becomes 7
      expect(generatedSlugs[5].length).toBe(7);
      // After more collisions: length becomes 8 and stays there
      expect(generatedSlugs[6].length).toBe(8);
      expect(generatedSlugs[7].length).toBe(8);
      expect(generatedSlugs[8].length).toBe(8);
      expect(generatedSlugs[9].length).toBe(8);
    });

    it('should increase length from custom starting length', async () => {
      const generatedSlugs: string[] = [];

      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        // 5 collisions, then success
        if (generatedSlugs.length <= 5) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      const slug = await generateUniqueSlug(7);

      // First 5 should be 7 chars
      expect(generatedSlugs[0].length).toBe(7);
      expect(generatedSlugs[4].length).toBe(7);

      // 6th should be 8 chars (increased)
      expect(generatedSlugs[5].length).toBe(8);
    });

    it('should not increase length beyond 8 characters', async () => {
      const generatedSlugs: string[] = [];

      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const slug = args.where.slug;
        generatedSlugs.push(slug);

        // Keep colliding until 8 attempts
        if (generatedSlugs.length <= 7) {
          return { id: `id${generatedSlugs.length}` } as any;
        }
        return null;
      });

      await generateUniqueSlug(8, 10);

      // All slugs should be max 8 characters
      generatedSlugs.forEach(slug => {
        expect(slug.length).toBeLessThanOrEqual(8);
      });
    });
  });

  describe('generateUniqueSlug - Max Retry Failure', () => {
    it('should throw error after max retries with persistent collisions', async () => {
      // Mock persistent collisions
      vi.mocked(prisma.shader.findUnique).mockResolvedValue({ id: 'collision' } as any);

      await expect(generateUniqueSlug(6, 10)).rejects.toThrow(
        'Failed to generate unique slug after 10 attempts'
      );

      // Should have tried exactly maxRetries times
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(10);
    });

    it('should throw error with custom max retries', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue({ id: 'collision' } as any);

      await expect(generateUniqueSlug(6, 3)).rejects.toThrow(
        'Failed to generate unique slug after 3 attempts'
      );

      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should throw descriptive error message', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue({ id: 'collision' } as any);

      try {
        await generateUniqueSlug(6, 5);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Failed to generate unique slug after 5 attempts');
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should fail at exact max retry count', async () => {
      let callCount = 0;

      vi.mocked(prisma.shader.findUnique).mockImplementation(async () => {
        callCount++;
        // Always return collision
        return { id: 'collision' } as any;
      });

      const maxRetries = 7;
      await expect(generateUniqueSlug(6, maxRetries)).rejects.toThrow();

      expect(callCount).toBe(maxRetries);
    });
  });

  describe('generateUniqueSlug - Edge Cases', () => {
    it('should handle length 1 slug generation', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug(1);

      expect(slug.length).toBe(1);
      expect(slug).toMatch(/^[a-zA-Z0-9]$/);
    });

    it('should handle very long preferred length', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug(20);

      expect(slug.length).toBe(20);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate different slugs on subsequent calls', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug1 = await generateUniqueSlug();
      const slug2 = await generateUniqueSlug();
      const slug3 = await generateUniqueSlug();

      // Very unlikely to be the same (1 in 62^6 chance)
      expect(slug1).not.toBe(slug2);
      expect(slug2).not.toBe(slug3);
      expect(slug1).not.toBe(slug3);
    });

    it('should handle maxRetries of 1', async () => {
      vi.mocked(prisma.shader.findUnique)
        .mockResolvedValueOnce({ id: 'collision' } as any);

      await expect(generateUniqueSlug(6, 1)).rejects.toThrow(
        'Failed to generate unique slug after 1 attempts'
      );

      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should succeed on last possible retry', async () => {
      const maxRetries = 5;

      // Mock collisions for all but the last attempt
      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        const callCount = vi.mocked(prisma.shader.findUnique).mock.calls.length;

        if (callCount < maxRetries) {
          return { id: 'collision' } as any;
        }
        return null; // Success on last try
      });

      const slug = await generateUniqueSlug(6, maxRetries);

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(maxRetries);
    });

    it('should maintain alphanumeric constraint at all lengths', async () => {
      const lengths = [1, 3, 6, 8, 12, 20];

      for (const length of lengths) {
        vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

        const slug = await generateUniqueSlug(length);

        expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
        expect(slug.length).toBe(length);
      }
    });
  });

  describe('generateUniqueSlug - Database Interaction', () => {
    it('should query database with generated slug', async () => {
      let queriedSlug: string | undefined;

      vi.mocked(prisma.shader.findUnique).mockImplementation(async (args: any) => {
        queriedSlug = args.where.slug;
        return null;
      });

      const slug = await generateUniqueSlug();

      expect(queriedSlug).toBe(slug);
    });

    it('should check only id field from database', async () => {
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      await generateUniqueSlug();

      expect(prisma.shader.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true },
        })
      );
    });

    it('should identify collision when shader exists', async () => {
      // Return a shader object (collision)
      vi.mocked(prisma.shader.findUnique)
        .mockResolvedValueOnce({ id: 'existing-shader-123' } as any)
        .mockResolvedValueOnce(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should identify unique slug when shader does not exist', async () => {
      // Return null (no shader found = unique)
      vi.mocked(prisma.shader.findUnique).mockResolvedValue(null);

      const slug = await generateUniqueSlug();

      expect(slug).toBeDefined();
      expect(prisma.shader.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
