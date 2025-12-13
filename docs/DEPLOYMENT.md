# FRAGCODER Deployment Guide

## Production Architecture

FRAGCODER is deployed as a split-service architecture:

- **Frontend**: Vercel (React SPA)
- **Backend**: Railway (Express API)
- **Database**: Railway PostgreSQL

Live deployment: [fragcoder.vercel.app](https://fragcoder.vercel.app)

## Frontend Deployment (Vercel)

### Setup

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Environment Variables

Set in Vercel dashboard:
```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Deployment

Vercel auto-deploys on push to main branch.

## Backend Deployment (Railway)

### Setup

1. Create a new Railway project
2. Add a PostgreSQL database service
3. Add a Node.js service connected to your repo

### Configuration

- **Root Directory**: `backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Environment Variables

```
DATABASE_URL=postgresql://... (auto-set by Railway)
JWT_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-google-client-id
CORS_ORIGIN=https://fragcoder.vercel.app
NODE_ENV=production
```

### Database Migrations

Migrations run automatically on deploy via the start script, or manually:
```bash
npx prisma migrate deploy
```

## CI/CD Pipeline

GitHub Actions workflows handle:
- Running tests on PR
- Type checking
- Linting
- Auto-deployment to staging/production

See `.github/workflows/` for configuration.

## Monitoring

### Health Checks

- Frontend: `https://fragcoder.vercel.app/health`
- Backend: `https://your-backend.railway.app/health`

### Logs

- **Vercel**: Functions tab in dashboard
- **Railway**: Logs tab in service dashboard

## Rollback

### Vercel
Use the deployments tab to instantly rollback to any previous deployment.

### Railway
Redeploy a previous commit or use Railway's deployment history.
