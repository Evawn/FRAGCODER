# Testing Guide for FRAGCODER

This project uses **Vitest** for both frontend and backend testing. Vitest is a fast, modern test runner built for Vite projects.

## Quick Start

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

## Project Structure

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

## Writing Tests

### Frontend Tests

#### Testing Utilities (Pure Functions)

```typescript
// frontend/src/utils/GLSLCompiler.test.ts
import { describe, it, expect } from 'vitest';
import { GLSLCompiler } from './GLSLCompiler';

describe('GLSLCompiler', () => {
  it('should compile valid GLSL code', () => {
    const compiler = new GLSLCompiler();
    const result = compiler.compile('void main() { gl_FragColor = vec4(1.0); }');

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect syntax errors', () => {
    const compiler = new GLSLCompiler();
    const result = compiler.compile('invalid glsl code');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

#### Testing React Hooks

```typescript
// frontend/src/hooks/useAuth.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should sign in user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test sign in logic here
  });
});
```

#### Testing React Components

```typescript
// frontend/src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Backend Tests

#### Testing Utilities

```typescript
// backend/src/utils/jwt.test.ts
import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from './jwt';

describe('JWT Utilities', () => {
  it('should generate a valid token', () => {
    const token = generateToken('user123', 'test@example.com');

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should verify a valid token', () => {
    const token = generateToken('user123', 'test@example.com');
    const payload = verifyToken(token);

    expect(payload).toBeTruthy();
    expect(payload?.userId).toBe('user123');
    expect(payload?.email).toBe('test@example.com');
  });

  it('should reject invalid tokens', () => {
    const payload = verifyToken('invalid.token.here');

    expect(payload).toBeNull();
  });
});
```

#### Testing API Routes (Integration Tests)

```typescript
// backend/src/routes/auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { clearDatabase, createTestUser } from '../test/testDb';

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('new@example.com');
  });

  it('should reject duplicate emails', async () => {
    await createTestUser({ email: 'existing@example.com' });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });
});

describe('POST /api/auth/signin', () => {
  it('should authenticate valid credentials', async () => {
    // Create test user first
    await createTestUser({
      email: 'test@example.com',
      passwordHash: '$2b$10$...' // Use actual bcrypt hash
    });

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

## Test Database Setup

For backend tests, you should use a separate test database:

1. Create `.env.test` file in `backend/`:
   ```bash
   cp backend/.env.test.example backend/.env.test
   ```

2. The test database will be automatically created at `backend/prisma/test.db`

3. Use the helper functions from `backend/src/test/testDb.ts`:
   - `clearDatabase()` - Remove all data
   - `createTestUser()` - Create a test user
   - `createTestShader()` - Create a test shader
   - `seedTestData()` - Seed common test data

## Best Practices

### General

- **Test naming**: Use descriptive names that explain what is being tested
- **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
- **One assertion per test**: Focus each test on a single behavior
- **Avoid interdependence**: Each test should be independent

### Frontend

- **Mock WebGL**: WebGL is automatically mocked in the test setup
- **Mock API calls**: Use `vi.mock()` to mock axios requests
- **Test user interactions**: Use `fireEvent` or `userEvent` for interactions
- **Test accessibility**: Use `screen.getByRole()` and `getByLabelText()`

### Backend

- **Database isolation**: Clear the database before/after each test
- **Test authentication**: Test both authenticated and unauthenticated requests
- **Test error cases**: Test validation errors, missing data, etc.
- **Use supertest**: It automatically handles server lifecycle

## Coverage Goals

- **Utilities**: 80%+ coverage (pure functions are easy to test)
- **API Routes**: 70%+ coverage (test happy paths + error cases)
- **React Hooks**: 60%+ coverage (focus on business logic)
- **React Components**: 40%+ coverage (focus on key interactions)

## CI/CD Integration

For continuous integration, use:

```bash
npm run test:run        # Run all tests once
npm run test:coverage   # Generate coverage reports
```

Coverage reports are generated in:
- `frontend/coverage/`
- `backend/coverage/`

## Common Patterns

### Mocking Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue('async value');
```

### Mocking Modules

```typescript
vi.mock('../api/shaders', () => ({
  fetchShaders: vi.fn(() => Promise.resolve([])),
}));
```

### Testing Async Code

```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeTruthy();
});
```

### Waiting for Updates

```typescript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Debugging Tests

### Run a single test file

```bash
npx vitest path/to/file.test.ts
```

### Run tests matching a pattern

```bash
npx vitest -t "should compile valid GLSL"
```

### Debug in VS Code

Add this to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
