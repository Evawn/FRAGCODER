import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  googleId: string;
  email: string;
  username: string;
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

/**
 * Check if user exists with Google account
 * @param credential - Google OAuth credential token
 * @returns Response with user data if exists, or profile data for registration
 */
export async function checkGoogleAuth(credential: string): Promise<GoogleAuthResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/auth/google`, {
    credential,
  });
  return response.data;
}

/**
 * Register new user with Google OAuth
 * @param credential - Google OAuth credential token
 * @param username - User-chosen username
 * @returns User data and JWT token
 */
export async function registerUser(
  credential: string,
  username: string
): Promise<RegisterResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
    credential,
    username,
  });
  return response.data;
}

/**
 * Get current authenticated user
 * @param token - JWT authentication token
 * @returns Current user data
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.user;
}

/**
 * Set default authorization header for all requests
 * @param token - JWT token or null to remove header
 */
export function setAuthToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}
