import { apiClient, setAuthToken } from './client';
import type { User, GoogleAuthResponse, RegisterResponse } from '../types';

/**
 * Check if user exists with Google account
 * @param credential - Google OAuth credential token
 * @returns Response with user data if exists, or profile data for registration
 * @throws ApiError with message and status code on failure
 */
export async function checkGoogleAuth(credential: string): Promise<GoogleAuthResponse> {
  const response = await apiClient.post('/api/auth/google', {
    credential,
  });
  return response.data;
}

/**
 * Register new user with Google OAuth
 * @param credential - Google OAuth credential token
 * @param username - User-chosen username
 * @returns User data and JWT token
 * @throws ApiError with message and status code on failure
 */
export async function registerUser(
  credential: string,
  username: string
): Promise<RegisterResponse> {
  const response = await apiClient.post('/api/auth/register', {
    credential,
    username,
  });
  return response.data;
}

/**
 * Get current authenticated user
 * @param token - JWT authentication token
 * @returns Current user data
 * @throws ApiError with message and status code on failure
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await apiClient.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.user;
}

// Re-export setAuthToken from client
export { setAuthToken };
