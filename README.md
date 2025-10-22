# FRAGCODER

> A full-stack web application for creating, editing, and sharing GLSL fragment shaders with live WebGL rendering

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000.svg)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748.svg)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## **[ADD DEMO LINK HERE]**

**[ADD SCREENSHOT: Main Editor Interface]**

---

## Overview

FRAGCODER is a Shadertoy-inspired platform that enables developers and artists to create, compile, and share WebGL fragment shaders in real-time. Built as a full-stack TypeScript monorepo, it showcases professional web development practices including type-safe API contracts, custom GLSL compilation, and modern React patterns.

**Key Highlights:**
- 🎨 **Custom GLSL Compiler** with multi-pass support and syntax error detection
- ⚡ **Real-time WebGL Rendering** powered by Three.js
- 🔐 **Secure Authentication** via Google OAuth and JWT
- 🔄 **Fork & Share** shaders with unique URLs
- 📚 **Public Gallery** with shader browsing and discovery
- 🧪 **85%+ Test Coverage** on core business logic

---

## Features

### Editor & Compilation
- **Advanced Code Editor** with syntax highlighting (CodeMirror 6)
- **Live GLSL Compilation** with up to 4 pre-pass buffers + common code tab
- **Real-time Error Detection** with inline decorations showing line/column
- **Auto-completion & Tooltips** for built-in GLSL uniforms and functions
- **Collapsible Code Sections** for better organization

### WebGL Rendering
- **Live Preview** with play/pause controls and time scrubbing
- **Multiple Render Passes** for advanced shader effects
- **Built-in Uniforms** (time, resolution, mouse position)
- **Performance Monitoring** with FPS counter

### Shader Management
- **Save & Load** shaders with unique slugs
- **Public/Private** visibility controls
- **Fork Functionality** to copy and modify existing shaders
- **Gallery View** with thumbnail previews and search
- **Version Tracking** with timestamps (created, updated, last saved)

### Authentication
- **Google OAuth Integration** for seamless sign-in
- **JWT-based Sessions** with secure token management
- **User Ownership** validation for shader modifications

---

## Tech Stack

### Frontend
- **React 19** with TypeScript for type-safe UI development
- **Vite** for fast development and optimized builds
- **TailwindCSS** for utility-first styling
- **CodeMirror 6** for advanced code editing
- **Three.js** for WebGL rendering
- **React Router** for client-side navigation
- **Axios** for API communication with request/response interceptors

### Backend
- **Express 5** with TypeScript for RESTful API
- **Prisma 6** ORM for type-safe database queries
- **PostgreSQL** for reliable, production-ready data storage
- **JWT** for authentication and authorization
- **Google OAuth** for third-party authentication
- **CORS** configured for secure cross-origin requests

### Shared
- **TypeScript Types** shared between frontend and backend
- **Monorepo Structure** for code organization and reusability

### Testing
- **Vitest** for unit and integration tests
- **React Testing Library** for component testing
- **Test Coverage:** GLSLCompiler (95%), editorPageHelpers (100%), useEditorState (87%)

---

## Architecture Highlights

### Type-Safe Monorepo
- Shared TypeScript types between frontend and backend prevent runtime errors
- Path aliases (`@fragcoder/shared`) for clean imports
- Single source of truth for API contracts

### Clean Separation of Concerns
- **Declarative UI** (React hooks and components)
- **Imperative Business Logic** (pure functions and utilities)
- **Service Layer Pattern** for database operations
- **Custom Error Hierarchy** with HTTP semantics

### Key Files to Explore
- [shared/types.ts](shared/types.ts) - Type-safe API contracts
- [backend/src/middleware/errorHandler.ts](backend/src/middleware/errorHandler.ts) - Professional error handling
- [frontend/src/hooks/useEditorState.ts](frontend/src/hooks/useEditorState.ts) - Complex state management (445 lines)
- [frontend/src/utils/GLSLCompiler.ts](frontend/src/utils/GLSLCompiler.ts) - Custom GLSL compiler
- [frontend/src/utils/WebGLRenderer.ts](frontend/src/utils/WebGLRenderer.ts) - WebGL rendering engine

---

## Getting Started

### Quick Start with Docker (Recommended)

The easiest way to run FRAGCODER is with Docker. This method requires no manual dependency installation or database setup.

**Prerequisites:**
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Google OAuth Client ID](https://console.cloud.google.com/)

**Steps:**
```bash
# 1. Clone the repository
git clone https://github.com/your-username/fragcoder.git
cd fragcoder

# 2. Configure environment variables
cp backend/.env.docker.example .env
# Edit .env and add your GOOGLE_CLIENT_ID and JWT_SECRET

# 3. Start the application
docker-compose up --build

# Access at http://localhost:5173
```

**See [README-DOCKER.md](README-DOCKER.md) for detailed Docker documentation.**

---

### Local Development Setup

If you prefer to run the application locally without Docker:

#### Prerequisites
- **Node.js** 18+ and npm
- **Git** for cloning the repository

#### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/fragcoder.git
   cd fragcoder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create `backend/.env`:
   ```bash
   DATABASE_URL="postgresql://shader_user:shader_password@localhost:5432/shader_playground"
   JWT_SECRET="your-secret-key-generate-a-strong-one"
   GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   PORT=3001
   FRONTEND_URL="http://localhost:5173"
   ```

   Create `frontend/.env`:
   ```bash
   VITE_API_URL="http://localhost:3001"
   VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   ```

   *See `.env.example` files in each directory for more details.*

4. **Start PostgreSQL database:**
   ```bash
   # Start just the PostgreSQL service from Docker Compose
   docker-compose up postgres -d
   ```

5. **Initialize the database:**
   ```bash
   cd backend
   npx prisma migrate deploy
   cd ..
   ```

#### Running the Application

**Development mode (both frontend and backend):**
```bash
npm run dev
```

**Or run separately:**
```bash
npm run dev:frontend  # Frontend only (http://localhost:5173)
npm run dev:backend   # Backend only (http://localhost:3001)
```

The frontend will be available at **http://localhost:5173** and the backend API at **http://localhost:3001**.

---

## Project Structure

```
fragcoder/
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── pages/        # Route components (Home, Gallery, Editor)
│   │   ├── components/   # Reusable UI components (30+)
│   │   ├── hooks/        # Custom React hooks (useEditorState, useWebGLRenderer)
│   │   ├── api/          # API client with Axios interceptors
│   │   ├── utils/        # Business logic (GLSLCompiler, WebGLRenderer)
│   │   └── contexts/     # React Context (Auth, Theme)
│   └── vite.config.ts
│
├── backend/               # Express + Prisma API
│   ├── src/
│   │   ├── routes/       # API endpoints (auth, shaders)
│   │   ├── middleware/   # Auth, error handling, CORS
│   │   ├── utils/        # JWT, slug generation, error classes
│   │   └── test/         # Test setup and utilities
│   └── prisma/
│       └── schema.prisma # Database schema
│
└── shared/                # Shared TypeScript types
    └── types.ts          # API contracts and interfaces
```

---

## Testing

**First-time setup:**
```bash
# 1. Create test environment file
cp backend/.env.test.example backend/.env.test

# 2. Initialize test database
cd backend
DATABASE_URL="file:./prisma/test.db" npx prisma migrate deploy
cd ..
```

**Run all tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

**Test specific files:**
```bash
# Frontend
npm test -- GLSLCompiler.test.ts
npm test -- useEditorState.test.ts

# Backend
npm test -- shaders.test.ts
npm test -- auth.test.ts
```

**Current Coverage:**
- `GLSLCompiler`: 95%
- `editorPageHelpers`: 100%
- `useEditorState`: 87%
- Backend routes and utils: 85%+

**Note:** Tests use a separate `test.db` database to avoid affecting your development data in `dev.db`.

---

## Deployment

**[ADD PRODUCTION URL HERE]**

### Recommended Platforms

**Frontend:** [Vercel](https://vercel.com) (zero-config Vite deployment)
**Backend:** [Railway](https://railway.app) or [Render](https://render.com) (includes PostgreSQL)

### Production Environment Variables

**Backend:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<generate-strong-32-char-secret>
GOOGLE_CLIENT_ID=<your-google-oauth-id>
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Frontend:**
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=<same-as-backend>
```

### Database Migration
```bash
cd backend
npx prisma migrate deploy
```

---

## Screenshots

**[ADD SCREENSHOT: Shader Gallery]**

**[ADD SCREENSHOT: Live WebGL Preview]**

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Author

**Evan Azari**

---

Built with ❤️ using TypeScript, React, and WebGL
