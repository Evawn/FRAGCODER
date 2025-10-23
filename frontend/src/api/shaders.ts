/** API client functions for shader CRUD operations: save, fetch, update, delete, and clone. */
import { apiClient } from './client';
import type {
  SaveShaderRequest,
  SaveShaderResponse,
  UpdateShaderRequest,
  UpdateShaderResponse,
  Shader,
} from '../types';

/**
 * Save a new shader
 * @param shaderData - Shader data including tabs and compilation status
 * @param token - JWT authentication token
 * @returns Saved shader data and URL
 * @throws ApiError with message and status code on failure
 */
export async function saveShader(
  shaderData: SaveShaderRequest,
  token: string
): Promise<SaveShaderResponse> {
  const response = await apiClient.post(
    '/api/shaders',
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
 * @throws ApiError with message and status code on failure (404 if not found, 403 if private)
 */
export async function getShaderBySlug(slug: string): Promise<Shader> {
  const response = await apiClient.get(`/api/shaders/${slug}`);
  return response.data.shader;
}

/**
 * Update an existing shader
 * @param slug - Shader URL slug
 * @param shaderData - Shader data to update (name, tabs, compilationStatus)
 * @param token - JWT authentication token
 * @returns Updated shader data
 * @throws ApiError with message and status code on failure
 */
export async function updateShader(
  slug: string,
  shaderData: UpdateShaderRequest,
  token: string
): Promise<UpdateShaderResponse> {
  const response = await apiClient.put(
    `/api/shaders/${slug}`,
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
 * Delete a shader
 * @param slug - Shader URL slug
 * @param token - JWT authentication token
 * @returns Success message
 * @throws ApiError with message and status code on failure
 */
export async function deleteShader(
  slug: string,
  token: string
): Promise<{ message: string }> {
  const response = await apiClient.delete(
    `/api/shaders/${slug}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Clone a shader
 * @param slug - Shader URL slug to clone
 * @param token - JWT authentication token
 * @returns Cloned shader data and URL
 * @throws ApiError with message and status code on failure
 */
export async function cloneShader(
  slug: string,
  token: string
): Promise<SaveShaderResponse> {
  const response = await apiClient.post(
    `/api/shaders/${slug}/clone`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

/**
 * Get public shaders with pagination and search
 * @param page - Page number (default: 1)
 * @param limit - Results per page (default: 12)
 * @param search - Optional search term for title, description, or author
 * @returns Paginated shader list with metadata
 * @throws ApiError with message and status code on failure
 */
export async function getPublicShaders(
  page: number = 1,
  limit: number = 12,
  search?: string
): Promise<{
  shaders: Shader[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });

  const response = await apiClient.get(`/api/shaders?${params}`);
  return response.data;
}
