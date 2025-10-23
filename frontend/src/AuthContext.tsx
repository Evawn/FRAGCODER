/* eslint-disable react-refresh/only-export-components */
/** Authentication context provider managing user sessions, JWT tokens, and localStorage persistence. */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from './types';
import { getCurrentUser, setAuthToken } from './api/auth';
import { logger } from './utils/logger';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token and user on mount
  useEffect(() => {
    const loadAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (savedToken) {
        try {
          setAuthToken(savedToken);
          const currentUser = await getCurrentUser(savedToken);
          setUser(currentUser);
          setToken(savedToken);
        } catch (error) {
          logger.error('Failed to load user from saved token', error);
          // Token invalid or expired, clear it
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setAuthToken(null);
        }
      }

      setLoading(false);
    };

    loadAuth();
  }, []);

  const signIn = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setAuthToken(newToken);
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
