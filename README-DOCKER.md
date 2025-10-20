# Docker Setup Guide for Shader Playground

This guide will help you run Shader Playground using Docker and Docker Compose. The setup includes three services: PostgreSQL database, Express backend API, and React frontend served by nginx.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)
- [Google OAuth Client ID](https://console.cloud.google.com/) (required for authentication)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/shader-playground.git
cd shader-playground
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with your Google OAuth credentials:

```bash
# Copy the example file
cp backend/.env.docker.example .env

# Edit the .env file with your credentials
# Required: Add your Google Client ID
# Required: Change JWT_SECRET to a secure random string
```

**Important:** You must set these two environment variables:

1. **GOOGLE_CLIENT_ID**: Get this from [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:5173` to authorized JavaScript origins
   - Add `http://localhost:5173` to authorized redirect URIs

2. **JWT_SECRET**: Generate a secure random string (minimum 32 characters)
   ```bash
   # Generate a secure JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### 3. Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

This command will:
- Build the frontend and backend Docker images
- Start PostgreSQL database
- Run database migrations automatically
- Start the backend API server
- Start the frontend web server

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432 (PostgreSQL)

### 5. Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v
```

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

## Docker Commands

### Development Workflow

```bash
# View running containers
docker-compose ps

# View logs from all services
docker-compose logs

# View logs from specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Rebuild a specific service
docker-compose up -d --build backend

# Execute commands in running container
docker-compose exec backend sh
docker-compose exec postgres psql -U shader_user -d shader_playground
```

### Database Management

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U shader_user -d shader_playground

# Run Prisma migrations manually
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio

# Create a database backup
docker-compose exec postgres pg_dump -U shader_user shader_playground > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U shader_user -d shader_playground < backup.sql
```

### Cleanup

```bash
# Remove stopped containers
docker-compose down

# Remove containers and volumes (deletes all data)
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all

# Remove all unused Docker resources
docker system prune -a
```

## Troubleshooting

### Backend fails to connect to database

**Problem:** Backend shows "PostgreSQL is unavailable" errors

**Solution:**
- Ensure PostgreSQL is healthy: `docker-compose ps`
- Check PostgreSQL logs: `docker-compose logs postgres`
- Wait 30-60 seconds for PostgreSQL to initialize on first run

### "GOOGLE_CLIENT_ID is required" error

**Problem:** Backend crashes with environment variable error

**Solution:**
- Ensure you created a `.env` file in the root directory
- Verify `GOOGLE_CLIENT_ID` is set in the `.env` file
- Restart the backend: `docker-compose restart backend`

### Port already in use

**Problem:** "Error: bind: address already in use"

**Solution:**
```bash
# Check what's using the port
# On Windows:
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# On Linux/Mac:
lsof -i :5173
lsof -i :3001

# Stop the conflicting process or change ports in docker-compose.yml
```

### Permission errors on Linux

**Problem:** Permission denied errors when building

**Solution:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then:
docker-compose up --build
```

### Database migration failures

**Problem:** Prisma migration errors on startup

**Solution:**
```bash
# Reset database and run migrations
docker-compose down -v
docker-compose up --build

# Or run migrations manually
docker-compose exec backend npx prisma migrate reset
```

## Production Deployment

For production deployment, consider these additional steps:

1. **Environment Variables:**
   - Use strong, unique `JWT_SECRET` (64+ characters)
   - Set `NODE_ENV=production`
   - Update `FRONTEND_URL` to your production domain
   - Use environment-specific Google OAuth credentials

2. **Database:**
   - Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL)
   - Enable automated backups
   - Configure connection pooling

3. **Security:**
   - Enable HTTPS/TLS
   - Configure proper CORS origins
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault)
   - Review nginx security headers

4. **Monitoring:**
   - Set up logging aggregation
   - Configure health check alerts
   - Monitor resource usage

5. **Scaling:**
   - Use a reverse proxy (nginx, Traefik)
   - Configure load balancing for backend
   - Use CDN for frontend static assets
   - Enable database replication

## Alternative: Development Mode with Hot Reload

For active development, you may prefer running services locally:

```bash
# Install dependencies
npm run install:all

# Run in development mode (local, not Docker)
npm run dev
```

This provides faster feedback loops with hot module replacement.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/yourusername/shader-playground/issues)
2. Review Docker logs: `docker-compose logs`
3. Verify your environment configuration
4. Open a new issue with detailed error messages and steps to reproduce
