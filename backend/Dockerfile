# Backend Dockerfile for Shader Playground
# Multi-stage build for optimized production image

FROM node:20-alpine AS base

# Install dependencies required for native modules (bcrypt, prisma)
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy shared package first (needed for dependency resolution)
COPY shared ./shared

# Copy package files for dependency installation
COPY backend/package*.json ./backend/

# Install ALL dependencies (including devDependencies needed for TypeScript build)
WORKDIR /app/backend
RUN npm ci && npm cache clean --force

# Copy Prisma schema for client generation
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build TypeScript (devDependencies like @types/* are needed here)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install openssl for Prisma and dos2unix for line ending normalization
RUN apk add --no-cache openssl python3 make g++ dos2unix

WORKDIR /app

# Copy shared package first
COPY shared ./shared

# Copy package files
COPY backend/package*.json ./backend/

# Install ONLY production dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema and generate client for production
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy built application from base stage
COPY --from=base /app/backend/dist ./dist

# Copy entrypoint script and ensure Unix line endings
COPY backend/docker-entrypoint.sh ./
RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
