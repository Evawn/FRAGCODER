import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface TabData {
  id: string;
  name: string;
  code: string;
}

export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
  passName?: string;
}

export type CompilationStatus = 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';

export interface SaveShaderRequest {
  name: string;
  tabs: TabData[];
  isPublic?: boolean;
  compilationStatus: CompilationStatus;
  compilationErrors?: CompilationError[];
  description?: string;
}

export interface Shader {
  id: string;
  title: string;
  slug: string;
  tabs: TabData[];
  description: string | null;
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

export interface SaveShaderResponse {
  shader: Shader;
  url: string;
}

/**
 * Save a new shader
 * @param shaderData - Shader data including tabs and compilation status
 * @param token - JWT authentication token
 * @returns Saved shader data and URL
 */
export async function saveShader(
  shaderData: SaveShaderRequest,
  token: string
): Promise<SaveShaderResponse> {
  const response = await axios.post(
    `${API_BASE_URL}/api/shaders`,
    shaderData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Get shader by slug
 * @param slug - Shader URL slug
 * @returns Shader data
 */
export async function getShaderBySlug(slug: string): Promise<Shader> {
  const response = await axios.get(`${API_BASE_URL}/api/shaders/${slug}`);
  return response.data.shader;
}
