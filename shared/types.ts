/**
 * Shared type definitions for FRAGCODER
 * Used by both frontend and backend to ensure type consistency across the API boundary
 */

// ============================================================================
// Compilation & Error Types
// ============================================================================

/**
 * Represents a compilation error or warning from GLSL shader compilation
 */
export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
  passName?: string;         // Which pass this error belongs to (Image, Buffer A-D, Common)
  originalLine?: number;      // Original line number before adjustments
  preprocessedLine?: number;  // Line number after preprocessing
}

/**
 * Compilation status enum - re-exported from Prisma for convenience
 */
export type CompilationStatus = 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';

// ============================================================================
// Tab & Shader Data Types
// ============================================================================

/**
 * Basic tab structure for API transport
 * Contains minimal data needed to represent a shader code tab
 */
export interface TabData {
  id: string;
  name: string;
  code: string;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User model representing authenticated users
 */
export interface User {
  id: string;
  googleId: string;
  email: string;
  username: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
}

// ============================================================================
// Shader Types
// ============================================================================

/**
 * Complete shader model from API
 * Represents a saved shader with all metadata
 */
export interface Shader {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tabs: TabData[];
  isPublic: boolean;
  compilationStatus: CompilationStatus;
  compilationErrors: CompilationError[] | null;
  userId: string;
  forkedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string;
  user: {
    id: string;
    username: string;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/shaders (create shader)
 */
export interface SaveShaderRequest {
  name: string;
  tabs: TabData[];
  isPublic?: boolean;
  compilationStatus: CompilationStatus;
  compilationErrors?: CompilationError[];
  description?: string;
}

/**
 * Response for POST /api/shaders (create shader)
 */
export interface SaveShaderResponse {
  shader: Shader;
  url: string;
}

/**
 * Request body for PUT /api/shaders/:slug (update shader)
 */
export interface UpdateShaderRequest {
  name: string;
  tabs: TabData[];
  compilationStatus: CompilationStatus;
}

/**
 * Response for PUT /api/shaders/:slug (update shader)
 */
export interface UpdateShaderResponse {
  shader: Shader;
}

/**
 * Response for POST /api/auth/google
 */
export interface GoogleAuthResponse {
  exists: boolean;
  user?: User;
  token?: string;
  profile?: {
    googleId: string;
    email: string;
  };
}

/**
 * Response for POST /api/auth/register
 */
export interface RegisterResponse {
  user: User;
  token: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standardized error response from API
 * All API errors follow this format for consistent frontend error handling
 */
export interface ErrorResponse {
  error: string;
  stack?: string; // Only included in development
}

/**
 * Client-side API error with structured information
 * Used by frontend to handle API errors in a type-safe manner
 */
export interface ApiError {
  message: string;
  statusCode: number;
  details?: any;
}
