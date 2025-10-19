/**
 * Frontend-specific type definitions for FRAGCODER
 * For shared types used by both frontend and backend, see @fragcoder/shared
 */

// Re-export shared types for convenience
export type {
  CompilationError,
  CompilationStatus,
  TabData,
  User,
  Shader,
  GoogleAuthResponse,
  RegisterResponse,
  SaveShaderRequest,
  SaveShaderResponse,
  UpdateShaderRequest,
  UpdateShaderResponse,
} from '@fragcoder/shared';

// Import shared types for use in frontend-only types
import type { CompilationError, TabData } from '@fragcoder/shared';

// ============================================================================
// Frontend-Only Types
// ============================================================================

/**
 * Extended tab interface with UI state
 * Extends the shared TabData with frontend-specific properties
 */
export interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;  // UI state: whether tab can be deleted
  errors: CompilationError[];  // UI state: current compilation errors for this tab
}

/**
 * Legacy ShaderData interface - kept for compatibility
 * Consider migrating usages to the Shader type from @fragcoder/shared
 * @deprecated Use Shader from @fragcoder/shared instead
 */
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
