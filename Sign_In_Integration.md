# Sign-In Integration - Phase 2 Plan

This document outlines the complete plan for implementing Phase 2 of the Google Sign-In authentication system for Shader Playground.

## Overview

Phase 1 (✅ Complete): Created the SignInPopover component with Google Sign-In widget
Phase 2 (This Plan): Backend integration, user state management, and database schema updates

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  SignInPopover Component                                        │ │
│  │  - Google Sign-In widget                                        │ │
│  │  - Username input form                                          │ │
│  └────────────────┬───────────────────────────────────────────────┘ │
│                   │                                                  │
│  ┌────────────────▼───────────────────────────────────────────────┐ │
│  │  Auth Context / State Management                                │ │
│  │  - currentUser: User | null                                     │ │
│  │  - token: string | null                                         │ │
│  │  - signIn(), signOut(), checkAuth()                             │ │
│  └────────────────┬───────────────────────────────────────────────┘ │
│                   │                                                  │
└───────────────────┼──────────────────────────────────────────────────┘
                    │ HTTP (Axios)
                    │
┌───────────────────▼──────────────────────────────────────────────────┐
│                      Backend API (Express)                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  POST /api/auth/google                                          │ │
│  │  - Verify Google JWT token                                      │ │
│  │  - Check if user exists (by googleId)                           │ │
│  │  - Return: { exists: boolean, user?: User, token?: string }    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  POST /api/auth/register                                        │ │
│  │  - Verify Google JWT token                                      │ │
│  │  - Create new user with username + Google profile data          │ │
│  │  - Return: { user: User, token: string }                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GET /api/auth/me                                               │ │
│  │  - Verify JWT token from Authorization header                   │ │
│  │  - Return current user data                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Middleware: authenticateToken                                  │ │
│  │  - Verify JWT token on protected routes                         │ │
│  │  - Attach user to request object                                │ │
│  └────────────────┬───────────────────────────────────────────────┘ │
│                   │                                                  │
└───────────────────┼──────────────────────────────────────────────────┘
                    │ Prisma ORM
                    │
┌───────────────────▼──────────────────────────────────────────────────┐
│                       Database (SQLite/PostgreSQL)                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  User Table                                                     │ │
│  │  - id: string (UUID)                                            │ │
│  │  - googleId: string (unique)                                    │ │
│  │  - email: string (unique, from Google)                          │ │
│  │  - username: string (unique, user-provided)                     │ │
│  │  - name: string (from Google profile)                           │ │
│  │  - picture: string (Google profile picture URL)                 │ │
│  │  - createdAt: DateTime                                          │ │
│  │  - updatedAt: DateTime                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2 Tasks Breakdown

### Task 1: Database Schema Updates

**File**: `backend/prisma/schema.prisma`

#### Changes to User Model:
```prisma
model User {
  id        String   @id @default(uuid())
  googleId  String   @unique              // NEW: Google OAuth user ID
  email     String   @unique              // UPDATED: From Google profile
  username  String   @unique              // User-chosen display name
  name      String?                       // NEW: Full name from Google
  picture   String?                       // NEW: Google profile picture URL
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt          // NEW: Track updates
  shaders   Shader[]                      // Existing relation

  @@index([googleId])
  @@index([email])
}
```

#### Remove password field:
- Remove `password` field (no longer needed for Google OAuth)
- Users authenticate via Google, not username/password

#### Steps:
1. Update `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client types

---

### Task 2: Backend - JWT Utilities

**File**: `backend/src/utils/jwt.ts` (NEW)

Create utility functions for JWT token management:

```typescript
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
}

// Generate JWT token for authenticated user
export function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

// Verify and decode JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    return null;
  }
}
```

#### Environment Variables:
Add to `backend/.env`:
```env
JWT_SECRET=your_random_secret_key_here_minimum_32_characters
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

### Task 3: Backend - Google Token Verification

**File**: `backend/src/utils/googleAuth.ts` (NEW)

Create utility to verify Google JWT tokens:

```typescript
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

export async function verifyGoogleToken(token: string): Promise<GoogleProfile | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      googleId: payload.sub,
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture || '',
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}
```

#### Install Required Package:
```bash
cd backend
npm install google-auth-library
```

---

### Task 4: Backend - Authentication Middleware

**File**: `backend/src/middleware/auth.ts` (NEW)

Create Express middleware to protect routes:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### Task 5: Backend - Auth Routes

**File**: `backend/src/routes/auth.ts` (NEW)

Create authentication endpoints:

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyGoogleToken } from '../utils/googleAuth';
import { generateToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/google - Check if user exists
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'No credential provided' });
  }

  try {
    // Verify Google token
    const profile = await verifyGoogleToken(credential);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
      select: {
        id: true,
        googleId: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        createdAt: true,
      },
    });

    if (user) {
      // User exists - sign them in
      const token = generateToken(user.id, user.email);
      return res.json({
        exists: true,
        user,
        token,
      });
    }

    // User doesn't exist
    return res.json({
      exists: false,
      profile, // Return profile data for registration
    });
  } catch (error) {
    console.error('Error in /api/auth/google:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register - Create new user account
router.post('/register', async (req, res) => {
  const { credential, username } = req.body;

  if (!credential || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate username
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    });
  }

  try {
    // Verify Google token
    const profile = await verifyGoogleToken(credential);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if user already exists with this Google ID
    const existingUser = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Account already exists' });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        googleId: profile.googleId,
        email: profile.email,
        username,
        name: profile.name,
        picture: profile.picture,
      },
      select: {
        id: true,
        googleId: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current user (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        googleId: true,
        email: true,
        username: true,
        name: true,
        picture: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

### Task 6: Backend - Update Main Server File

**File**: `backend/src/index.ts`

Add auth routes to the Express app:

```typescript
import authRoutes from './routes/auth';

// ... existing code ...

// Mount auth routes
app.use('/api/auth', authRoutes);

// ... existing code ...
```

---

### Task 7: Frontend - API Client Setup

**File**: `frontend/src/api/auth.ts` (NEW)

Create API client functions for authentication:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    name: string;
    picture: string;
  };
}

export interface RegisterResponse {
  user: User;
  token: string;
}

// Check if user exists with Google account
export async function checkGoogleAuth(credential: string): Promise<GoogleAuthResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/auth/google`, {
    credential,
  });
  return response.data;
}

// Register new user
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

// Get current user (requires auth token)
export async function getCurrentUser(token: string): Promise<User> {
  const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.user;
}

// Set default authorization header for all requests
export function setAuthToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}
```

---

### Task 8: Frontend - Auth Context

**File**: `frontend/src/context/AuthContext.tsx` (NEW)

Create React Context for authentication state:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, setAuthToken } from '../api/auth';

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
          console.error('Failed to load user:', error);
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

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

### Task 9: Frontend - Wrap App with AuthProvider

**File**: `frontend/src/App.tsx`

Wrap the application with AuthProvider:

```typescript
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Existing router and routes */}
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

---

### Task 10: Frontend - Update SignInPopover Component

**File**: `frontend/src/components/auth/SignInPopover.tsx`

Update to use real API calls:

#### Changes:
1. Import `useAuth` hook and API functions
2. Replace `handleGoogleSignIn` to call `checkGoogleAuth` API
3. Replace `handleCreateAccount` to call `registerUser` API
4. Call `signIn()` from auth context on success
5. Add proper error handling for API errors

#### Key Code Changes:

```typescript
import { useAuth } from '../../context/AuthContext';
import { checkGoogleAuth, registerUser } from '../../api/auth';

export function SignInPopover({ children }: SignInPopoverProps) {
  const { signIn } = useAuth();

  const handleGoogleSignIn = async (response: GoogleCredentialResponse) => {
    setLoading(true);
    setError(null);

    try {
      const result = await checkGoogleAuth(response.credential);

      if (result.exists && result.user && result.token) {
        // User exists, sign them in
        signIn(result.user, result.token);
        setOpen(false);
        resetState();
      } else {
        // New user, show username input
        setGoogleCredential(response.credential);
        setShowUsernameInput(true);
      }
    } catch (err: any) {
      console.error('Error during sign-in:', err);
      const message = err.response?.data?.error || 'Failed to sign in. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!googleCredential) {
      setError('Authentication error. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await registerUser(googleCredential, username.trim());

      // Success - sign in the user
      signIn(result.user, result.token);
      setOpen(false);
      resetState();
    } catch (err: any) {
      console.error('Error creating account:', err);
      const message = err.response?.data?.error || 'Failed to create account. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
}
```

---

### Task 11: Frontend - Update ShaderEditor to Show User

**File**: `frontend/src/components/editor/ShaderEditor.tsx`

Update to show username when signed in:

```typescript
import { useAuth } from '../../context/AuthContext';

function ShaderEditor({ ... }: ShaderEditorProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="...">
        {/* ... existing code ... */}

        {/* Right-side buttons */}
        <div className="flex items-center gap-2">
          <Button ...>
            <span className="text-lg">New+</span>
          </Button>

          {user ? (
            // Show user menu when signed in
            <Dropdown
              options={[
                {
                  text: `@${user.username}`,
                  callback: () => {},
                },
                {
                  text: 'My Shaders',
                  callback: () => console.log('Navigate to my shaders'),
                },
                {
                  text: 'Sign Out',
                  callback: () => {
                    signOut();
                    console.log('User signed out');
                  },
                },
              ]}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
                style={{ outline: 'none', border: 'none' }}
              >
                <div className="flex items-center gap-2">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.username}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-lg">{user.username}</span>
                </div>
              </Button>
            </Dropdown>
          ) : (
            // Show Sign In popover when not signed in
            <SignInPopover>
              <Button ...>
                <span className="text-lg">Sign In</span>
              </Button>
            </SignInPopover>
          )}
        </div>
      </div>

      {/* ... rest of component ... */}
    </div>
  );
}
```

---

### Task 12: Environment Configuration

#### Backend `.env`:
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your_random_secret_key_here_minimum_32_characters

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Server
PORT=3001
NODE_ENV=development
```

#### Frontend `.env`:
```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# API URL
VITE_API_URL=http://localhost:3001
```

---

## Testing Plan

### Manual Testing Checklist

#### 1. New User Registration Flow
- [ ] Click "Sign In" button
- [ ] Popover opens with Google Sign-In button
- [ ] Click Google button and authenticate
- [ ] Username input form appears
- [ ] Enter valid username (3+ characters)
- [ ] Account created successfully
- [ ] User signed in and popover closes
- [ ] Username appears in header (with profile picture)

#### 2. Existing User Sign-In Flow
- [ ] Sign out from user menu
- [ ] Click "Sign In" button
- [ ] Click Google button and authenticate
- [ ] User signed in immediately (no username prompt)
- [ ] Popover closes automatically

#### 3. Error Handling
- [ ] Try registering with username < 3 characters → Error shown
- [ ] Try registering with duplicate username → "Username already taken"
- [ ] Try signing in with invalid token → Error shown
- [ ] Sign out and refresh page → User stays signed out
- [ ] Sign in and refresh page → User stays signed in (token persists)

#### 4. User Menu
- [ ] Click username in header → Dropdown opens
- [ ] Shows username at top
- [ ] "My Shaders" option (placeholder)
- [ ] Click "Sign Out" → User signed out
- [ ] "Sign In" button appears again

#### 5. Protected Routes (Future)
- [ ] Try accessing protected API endpoint without token → 401 error
- [ ] Try accessing protected API endpoint with valid token → Success
- [ ] Try accessing protected API endpoint with expired token → 403 error

---

## Security Considerations

### Backend Security
1. **JWT Secret**: Use strong, random secret (minimum 32 characters)
2. **Token Expiration**: Tokens expire after 7 days
3. **Google Token Verification**: Always verify Google tokens server-side
4. **Input Validation**: Validate all user inputs (username, etc.)
5. **CORS Configuration**: Only allow requests from frontend domain
6. **Environment Variables**: Never commit `.env` files

### Frontend Security
1. **Token Storage**: Store JWT in localStorage (or httpOnly cookies for production)
2. **HTTPS**: Use HTTPS in production (required by Google OAuth)
3. **Token Refresh**: Implement token refresh before expiration (future enhancement)
4. **XSS Prevention**: React automatically escapes content
5. **CSRF Protection**: Not needed for JWT-based auth with proper CORS

### Production Considerations
1. Use PostgreSQL instead of SQLite
2. Use httpOnly cookies instead of localStorage for tokens
3. Implement token refresh mechanism
4. Add rate limiting to auth endpoints
5. Set up proper CORS configuration
6. Use environment-specific Google OAuth clients
7. Enable Google OAuth consent screen (publish from "Testing" to "Production")

---

## Error Handling Strategy

### Backend Errors
- `400 Bad Request` - Invalid input (missing fields, validation errors)
- `401 Unauthorized` - Invalid credentials or missing token
- `403 Forbidden` - Valid token but insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate username or email
- `500 Internal Server Error` - Server/database errors

### Frontend Error Display
- Show errors in red alert box in popover
- Clear errors when user takes action (typing, closing popover)
- Log detailed errors to console for debugging
- Show user-friendly messages (not technical details)

---

## Migration Path (Existing Users)

If you have existing users with password-based auth:

1. **Keep Password Field** (optional, for backwards compatibility)
2. **Add Google ID Field** (nullable initially)
3. **Allow Account Linking**: Let users link their Google account to existing account
4. **Migration Endpoint**: `POST /api/auth/link-google`
   - User logs in with password
   - Links their Google account
   - Future logins use Google OAuth

---

## Future Enhancements

### Phase 3 (Post-Authentication Features)
1. **User Profile Page**
   - Edit username
   - View public profile
   - View created shaders

2. **Shader Ownership**
   - Save shader with user association
   - Edit/delete own shaders only
   - Fork other users' shaders

3. **Social Features**
   - Like/favorite shaders
   - Comments on shaders
   - Follow other users
   - Activity feed

4. **Token Refresh**
   - Implement refresh tokens
   - Auto-refresh before expiration
   - Seamless user experience

5. **Multiple Auth Providers**
   - GitHub OAuth
   - Discord OAuth
   - Email/password (optional)

---

## File Structure Summary

```
Shader Playground/
├── backend/
│   ├── src/
│   │   ├── index.ts (MODIFY)
│   │   ├── middleware/
│   │   │   └── auth.ts (NEW)
│   │   ├── routes/
│   │   │   └── auth.ts (NEW)
│   │   └── utils/
│   │       ├── jwt.ts (NEW)
│   │       └── googleAuth.ts (NEW)
│   ├── prisma/
│   │   └── schema.prisma (MODIFY)
│   ├── .env (MODIFY)
│   └── package.json (MODIFY - add google-auth-library)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx (MODIFY)
│   │   ├── api/
│   │   │   └── auth.ts (NEW)
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── SignInPopover.tsx (MODIFY)
│   │   │   └── editor/
│   │   │       └── ShaderEditor.tsx (MODIFY)
│   │   └── context/
│   │       └── AuthContext.tsx (NEW)
│   └── .env (MODIFY)
│
└── Sign_In_Integration.md (THIS FILE)
```

---

## Implementation Order

1. **Backend Foundation** (Tasks 1-4)
   - Update database schema
   - Create JWT utilities
   - Create Google auth utilities
   - Create auth middleware

2. **Backend Routes** (Tasks 5-6)
   - Create auth routes
   - Update main server file

3. **Frontend Foundation** (Tasks 7-9)
   - Create API client
   - Create auth context
   - Wrap app with provider

4. **Frontend Integration** (Tasks 10-11)
   - Update SignInPopover
   - Update ShaderEditor

5. **Configuration & Testing** (Task 12)
   - Set up environment variables
   - Manual testing
   - Bug fixes

---

## Estimated Time

- Backend Implementation: **2-3 hours**
- Frontend Integration: **1-2 hours**
- Testing & Bug Fixes: **1 hour**
- **Total: 4-6 hours**

---

## Dependencies to Install

### Backend
```bash
cd backend
npm install google-auth-library
npm install jsonwebtoken
npm install @types/jsonwebtoken --save-dev
```

### Frontend
No new dependencies needed (axios already installed)

---

## Success Criteria

Phase 2 is complete when:

- [✅] Users can sign in with Google account
- [✅] New users can create account with username
- [✅] Existing users sign in automatically
- [✅] User state persists across page refreshes
- [✅] Signed-in users see their username in header
- [✅] Users can sign out via dropdown menu
- [✅] JWT tokens secure all protected endpoints
- [✅] All error cases handled gracefully
- [✅] No TypeScript errors
- [✅] Backend and frontend communicate correctly

---

## Questions to Consider

1. **Username Requirements**: Should we allow special characters? Unicode?
2. **Username Changes**: Can users change their username later?
3. **Email Visibility**: Should emails be public or private?
4. **Account Deletion**: How do we handle account deletion requests?
5. **Multiple Google Accounts**: Can one user link multiple Google accounts?

---

## Next Steps After Phase 2

Once authentication is complete, the next logical features are:

1. **Shader Saving**: Associate shaders with user accounts
2. **My Shaders Page**: View and manage your shaders
3. **Shader Gallery**: Browse all public shaders with user attribution
4. **Shader Forking**: Fork and remix other users' shaders
5. **Shader Privacy**: Toggle public/private for each shader

---

## Support & Resources

- [Google Identity Services Docs](https://developers.google.com/identity/gsi/web)
- [JWT.io](https://jwt.io/) - JWT debugger
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [React Context Guide](https://react.dev/reference/react/useContext)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-10
**Status**: Ready for Implementation
