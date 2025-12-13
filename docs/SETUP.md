# FRAGCODER Setup Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)
- [Node.js](https://nodejs.org/) (v18+) - only needed for development mode
- [Google OAuth Client ID](https://console.cloud.google.com/) - required for authentication

## Quick Start with Docker (Recommended)

The easiest way to run FRAGCODER. No manual dependency installation required.

### First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/Evawn/FRAGCODER.git
cd fragcoder

# 2. Configure environment variables
cp .env.docker.example .env
```

Edit `.env` and set:
- `JWT_SECRET` - Any secret string for JWT signing
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID (see below)

### Getting Your Google Client ID

1. Open the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials > OAuth 2.0 Client IDs**
4. Add `http://localhost:5173` to authorized JavaScript origins
5. Add `http://localhost:5173` to authorized redirect URIs
6. Copy the Client ID to your `.env` file

### Running the Application

```bash
# Start all services
docker compose up --build

# Access at http://localhost:5173
```

### Stopping the Application

```bash
# Stop services (keeps data)
docker compose down

# Stop and remove all data
docker compose down -v
```

## Development Mode (Hot Reload)

For active development with faster feedback loops:

```bash
# 1. Install dependencies
npm run install:all

# 2. Start PostgreSQL
docker compose up postgres -d

# 3. Run in development mode
npm run dev
```

### First-Time Development Setup

If this is your first time running in development mode:

```bash
# Copy environment files
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Run database migrations
cd backend
npx prisma migrate dev
```

## Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:3001 | Express REST API |
| Database | localhost:5432 | PostgreSQL |

## Troubleshooting

### Database connection issues
Ensure PostgreSQL is running: `docker compose up postgres -d`

### Port conflicts
Check if ports 5173, 3001, or 5432 are already in use.

### OAuth not working
Verify your Google OAuth credentials and authorized origins match your local URL.
