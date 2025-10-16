/**
 * Centralized type definitions for the FRAGCODER frontend
 * Contains shared interfaces and types used across multiple modules
 */

// ============================================================================
// Compilation & Error Types
// ============================================================================

export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
  passName?: string;  // Which pass this error belongs to (Image, Buffer A-D, Common)
  originalLine?: number;  // Original line number before adjustments
  preprocessedLine?: number;  // Line number after preprocessing
}

export type CompilationStatus = 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';

// ============================================================================
// Tab & Shader Data Types
// ============================================================================

export interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
  errors: CompilationError[];
}

export interface ShaderData {
  id: string;
  title: string;
  code: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  forkedFrom?: string;
  creatorUsername?: string;
}

export interface TabData {
  id: string;
  name: string;
  code: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface User {
  id: string;
  googleId: string;
  email: string;
  username: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
}

export interface GoogleAuthResponse {
  exists: boolean;
  user?: User;
  token?: string;
  profile?: {
    googleId: string;
    email: string;
  };
}

export interface RegisterResponse {
  user: User;
  token: string;
}

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

export interface SaveShaderRequest {
  name: string;
  tabs: TabData[];
  isPublic?: boolean;
  compilationStatus: CompilationStatus;
  compilationErrors?: CompilationError[];
  description?: string;
}

export interface SaveShaderResponse {
  shader: Shader;
  url: string;
}

export interface UpdateShaderRequest {
  name: string;
  tabs: TabData[];
  compilationStatus: CompilationStatus;
}

export interface UpdateShaderResponse {
  shader: Shader;
}
