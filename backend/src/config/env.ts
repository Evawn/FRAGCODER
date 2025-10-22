/**
 * Environment configuration - validates required environment variables at startup
 * and exports a type-safe configuration object for use throughout the application.
 */
export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: requireEnv('JWT_SECRET'),
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  // Frontend URL for CORS (defaults to localhost, set to https://fragcoder.vercel.app in production)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: requireEnv('DATABASE_URL'),
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
