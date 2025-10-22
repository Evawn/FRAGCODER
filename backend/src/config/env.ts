/**
 * Environment configuration - validates required environment variables at startup
 * and exports a type-safe configuration object for use throughout the application.
 */
export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: requireEnv('JWT_SECRET'),
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  // Parse comma-separated frontend URLs for CORS (supports multiple origins)
  frontendUrls: parseFrontendUrls(process.env.FRONTEND_URL || 'http://localhost:5173'),
  databaseUrl: requireEnv('DATABASE_URL'),
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Parse FRONTEND_URL environment variable into array of allowed origins
 * Supports single URL or comma-separated list
 * @example "http://localhost:5173" -> ["http://localhost:5173"]
 * @example "http://localhost:5173,https://app.github.dev" -> ["http://localhost:5173", "https://app.github.dev"]
 */
function parseFrontendUrls(urlString: string): string[] {
  return urlString
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);
}
