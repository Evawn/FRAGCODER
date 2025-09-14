# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shader Playground is a full-stack web application inspired by Shadertoy where users can create, edit, compile, and share GLSL fragment shaders with live WebGL rendering.

## Essential Commands

### Development
- `npm run dev` - Start both frontend (port 5173) and backend (port 3000) concurrently
- `npm run install:all` - Install dependencies for root, backend, and frontend

### Backend Commands (from root)
- `cd backend && npm run dev` - Start backend development server
- `cd backend && npm run prisma:migrate` - Run database migrations
- `cd backend && npm run prisma:studio` - Open Prisma Studio for database management
- `cd backend && npm run build` - Build TypeScript to JavaScript
- `cd backend && npm run start` - Run production build

### Frontend Commands (from root)
- `cd frontend && npm run dev` - Start frontend development server
- `cd frontend && npm run build` - Build production bundle
- `cd frontend && npm run lint` - Run ESLint

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
  - Three.js for WebGL shader rendering
  - CodeMirror for code editing with syntax highlighting
  - React Router for navigation
  - Axios for API calls
  
- **Backend**: Node.js + Express + TypeScript
  - Prisma ORM with SQLite (dev) / PostgreSQL (prod)
  - JWT authentication with bcrypt password hashing
  - RESTful API architecture

### Data Models
- **User**: id, email, username, password, createdAt, shaders[]
- **Shader**: id, title, code, description, isPublic, thumbnail, userId, forkedFrom, timestamps

### Project Structure
```
/
├── backend/         # Express API server
│   ├── prisma/      # Database schema and migrations
│   └── src/         # TypeScript source code
├── frontend/        # React application  
│   ├── src/         # React components and pages
│   └── public/      # Static assets
└── shared/          # Shared types/utilities (currently empty)
```

### Key Implementation Notes
- Backend runs on port 3000, frontend on port 5173
- Database uses SQLite in development (configured in .env)
- Authentication uses JWT tokens and bcrypt hashing
- Shaders are stored as text with optional base64 thumbnails
- Public/private shader visibility is supported via isPublic flag
- Forking is tracked via forkedFrom field

### Current Development Status
The project is in early stages with basic infrastructure set up. According to the roadmap, the next steps are:
1. Create three page skeletons (Gallery, Shader Editor/Player, Sign In/Sign Up)
2. Implement navigation between pages
3. Set up database and API endpoints
4. Build core features (editor, compiler, player, auth, save/load, gallery, forking)