/**
 * Default GLSL shader code templates for different buffer types
 * Used when creating new tabs in the shader editor
 */

const defaultMainImageCode = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y;
    fragColor = vec4(uv, 1.0, 1.0);
}`;

export const DEFAULT_SHADER_CODES = {
  Image: `// Image - Display all buffers in quadrants

${defaultMainImageCode}`,

  'Buffer A': `// Buffer A - Red pulsing circle

${defaultMainImageCode}`,

  'Buffer B': `// Buffer B - Green rotating square

${defaultMainImageCode}`,

  'Buffer C': `// Buffer C - Blue animated triangle

${defaultMainImageCode}`,

  'Buffer D': `// Buffer D - Yellow/orange gradient waves

${defaultMainImageCode}`,

  Common: `// Common - Shared functions and definitions
// Add your shared utilities here

// Example: Distance to circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Example: Rotation matrix
mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}`,
} as const;

/**
 * Get default code for a specific buffer type
 * Falls back to Image code if buffer type is not recognized
 */
export function getDefaultCode(bufferName: string): string {
  return DEFAULT_SHADER_CODES[bufferName as keyof typeof DEFAULT_SHADER_CODES] || DEFAULT_SHADER_CODES.Image;
}

/**
 * Default image code for backward compatibility
 * @deprecated Use DEFAULT_SHADER_CODES.Image instead
 */
export const defaultImageCode = DEFAULT_SHADER_CODES.Image;
