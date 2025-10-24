# Docker Setup Guide for Shader Playground

This guide will help you run Shader Playground using Docker and Docker Compose. The setup includes three services: PostgreSQL database, Express backend API, and React frontend served by nginx.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)
- [Google OAuth Client ID](https://console.cloud.google.com/) (required for authentication)

## Run with Docker

**Step 1**
```bash
# Clone the repository
git clone https://github.com/Evawn/Shader-Playground.git
cd fragcoder
```

**Step 2**
```bash

# Configure environment variables
cp .env.docker.example .env
# Edit .env and add your GOOGLE_CLIENT_ID and JWT_SECRET
```

Your `JWT_SECRET` can be anything you want.

Obtain your `GOOGLE_CLIENT_ID`:
1. Open the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new Cloud Console Project if you need to
3. Navigate to 'APIs & Services' > 'Credentials' > 'OAuth 2.0 Client IDs' > Your Project
4. Add `http://localhost:5173` to authorized JavaScript origins
5.  Add `http://localhost:5173` to authorized redirect URIs
6. Copy the 'ClientID' from this page, paste into the env as 'GOOGLE_CLIENT_ID'

**Step 3**
```bash
# Start the application
docker compose up --build

# Access at http://localhost:5173
```
This command will:
- Build the frontend and backend Docker images
- Start PostgreSQL database
- Run database migrations automatically
- Start the backend API server
- Start the frontend web server


**Access the Application**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432 (PostgreSQL)

**Stop the Application**
```bash
docker compose down
```
or
```bash
# Stop and remove all data (including database)
docker compose down -v
```

## Alternative: Development Mode with Hot Reload

For active development, you may prefer running services locally:

```bash
# Install dependencies
npm run install:all

# Start a your local PostgreSQL Server
docker compose up postgres -d

# Run in development mode (local, not Docker)
npm run dev
```

This provides faster feedback loops with hot module replacement.

## Architecture

The Docker setup consists of three interconnected services:

```
┌─────────────────┐
│   Frontend      │  Port 5173
│   (nginx)       │  React SPA
└────────┬────────┘
         │
         │ HTTP requests
         ▼
┌─────────────────┐
│   Backend       │  Port 3001
│   (Node.js)     │  Express API
└────────┬────────┘
         │
         │ Prisma ORM
         ▼
┌─────────────────┐
│   PostgreSQL    │  Port 5432
│   Database      │  Persistent data
└─────────────────┘
```

### Service Details

#### PostgreSQL Database
- **Image:** postgres:16-alpine
- **Port:** 5432
- **Credentials:**
  - User: `shader_user`
  - Password: `shader_password`
  - Database: `shader_playground`
- **Volume:** Persistent storage at `shader-playground-postgres-data`

#### Backend API
- **Base Image:** node:20-alpine
- **Port:** 3001
- **Features:**
  - Automatic database migration on startup
  - JWT-based authentication
  - Google OAuth integration
  - REST API endpoints
- **Health Check:** http://localhost:3001/health

#### Frontend
- **Base Image:** nginx:alpine
- **Port:** 5173
- **Features:**
  - Optimized production build
  - Client-side routing support
  - Static asset caching
  - Security headers
- **Health Check:** http://localhost:5173/health