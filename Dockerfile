# Frontend Dockerfile for Shader Playground
# Multi-stage build: build React app, then serve with nginx

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci && npm cache clean --force

# Copy shared package (no dependencies to install, just types)
WORKDIR /app
COPY shared ./shared

# Copy frontend source
COPY frontend ./frontend

# Build frontend with Google Client ID
WORKDIR /app/frontend

# Accept Google Client ID as build argument and expose to Vite
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
