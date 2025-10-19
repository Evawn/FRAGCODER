import { prisma } from '../db';

/**
 * Generates a random alphanumeric string of specified length
 */
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generates a unique slug for a shader URL
 * Format: 6-8 character alphanumeric string
 * Checks database for collisions and retries if necessary
 *
 * @param preferredLength - Desired length of slug (default: 6)
 * @param maxRetries - Maximum number of collision retries (default: 10)
 * @returns A unique slug string
 * @throws Error if unable to generate unique slug after max retries
 */
export async function generateUniqueSlug(
  preferredLength: number = 6,
  maxRetries: number = 10
): Promise<string> {
  let attempts = 0;

  while (attempts < maxRetries) {
    // Generate random slug
    const slug = generateRandomString(preferredLength);

    // Check if slug already exists in database
    const existingShader = await prisma.shader.findUnique({
      where: { slug },
      select: { id: true },
    });

    // If slug is unique, return it
    if (!existingShader) {
      return slug;
    }

    attempts++;

    // After a few collisions, increase slug length for better uniqueness
    if (attempts >= 5 && preferredLength < 8) {
      preferredLength++;
    }
  }

  throw new Error(
    `Failed to generate unique slug after ${maxRetries} attempts`
  );
}
