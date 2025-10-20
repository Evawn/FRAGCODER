#!/bin/sh
# Docker entrypoint script for Shader Playground backend
# Runs database migrations before starting the server

set -e

echo "🚀 Starting Shader Playground Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
counter=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "  PostgreSQL is unavailable - sleeping (${counter}/${timeout})"
  sleep 1
done

if [ $counter -eq $timeout ]; then
  echo "❌ PostgreSQL connection timeout after ${timeout} seconds"
  exit 1
fi

echo "✅ PostgreSQL is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  exit 1
fi

# Generate Prisma client (in case schema changed)
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Backend initialization complete!"
echo ""

# Execute the main command
exec "$@"
