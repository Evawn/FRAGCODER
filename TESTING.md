# Testing Guide for FRAGCODER

This project uses **Vitest** for both frontend and backend testing. Vitest is a fast, modern test runner built for Vite projects.

## Prerequisites

- **Docker**: Required for running PostgreSQL test database
- **Node.js**: v18 or higher
- **Backend tests require PostgreSQL to be running**

## Quick Start

### 1. Start PostgreSQL (Required for Backend Tests)

```bash
# Start PostgreSQL container with both dev and test databases
docker compose up postgres -d
```

This starts PostgreSQL with two databases:
- `shader_playground` (development)
- `shader_playground_test` (testing)

### 2. First-Time Test Setup

**Only needed once after starting PostgreSQL for the first time:**

```bash
# Set up test database configuration
cp backend/.env.test.example backend/.env.test

# Apply database schema to test database
cd backend
npm run test:db:migrate
cd ..
```

### 3. Run Tests

```bash
# Run all tests (frontend + backend)
npm test

# Run tests in watch mode (for development)
npm run test:backend    # Backend only
npm run test:frontend   # Frontend only

# Run tests once (for CI/CD)
npm run test:run

# Run tests with coverage reports
npm run test:coverage

# Open interactive test UI
cd frontend && npm run test:ui
cd backend && npm run test:ui
```

## Test Database Setup

Backend tests use a separate PostgreSQL test database (`shader_playground_test`) to match the development and production environments.

### Database Configuration

1. The test database is created automatically by Docker on first startup
2. Database URL: `postgresql://shader_user:shader_password@localhost:5432/shader_playground_test`
3. Configuration is stored in `backend/.env.test`

### Test Database Management

```bash
cd backend

# Apply migrations to test database
npm run test:db:migrate

# Reset test database (drop all data and reapply migrations)
npm run test:db:reset
```

### Test Helper Functions

Use the helper functions from `backend/src/test/testDb.ts`:
- `clearDatabase()` - Remove all data
- `createTestUser()` - Create a test user
- `createTestShader()` - Create a test shader
- `seedTestData()` - Seed common test data


## Test File Structure

```
frontend/
├── src/
│   ├── test/
│   │   └── setup.ts              # Global test configuration
│   ├── utils/
│   │   ├── GLSLCompiler.ts
│   │   └── GLSLCompiler.test.ts  # Unit tests for utilities
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useAuth.test.tsx      # Tests for React hooks
│   └── components/
│       └── Button.test.tsx       # Component tests
└── vitest.config.ts

backend/
├── src/
│   ├── test/
│   │   ├── setup.ts              # Global test configuration
│   │   └── testDb.ts             # Database test utilities
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── jwt.test.ts           # Unit tests for utilities
│   └── routes/
│       ├── auth.ts
│       └── auth.test.ts          # API integration tests
└── vitest.config.ts
```

## CI/CD Integration

For continuous integration environments, ensure PostgreSQL is running before executing tests.

### GitHub Actions Example

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: shader_user
      POSTGRES_PASSWORD: shader_password
      POSTGRES_DB: shader_playground_test
    ports:
      - 5432:5432
```

### Running Tests in CI

```bash
# Run all tests once (non-interactive)
npm run test:run

# Run tests with coverage reports
npm run test:coverage
```

### Coverage Reports

Coverage reports are generated in:
- `frontend/coverage/`
- `backend/coverage/`

The project uses Vitest with v8 coverage provider for accurate code coverage metrics.