# First Round Testing Implementation Plan

## Overview

Implement critical tests to demonstrate proper testing practices and cover the most important functionality in FRAGCODER. Focus on high-value tests that showcase the core GLSL compilation pipeline, authentication, and shader CRUD operations.

## Backend Tests (Priority Order)

### 1. JWT Utilities (`backend/src/utils/jwt.test.ts`)

- Test token generation with valid userId and email
- Test token verification with valid token
- Test token verification with invalid/expired tokens
- Test missing JWT_SECRET handling (dev vs production)
- **Target: 80%+ coverage**

### 2. Slug Generator (`backend/src/utils/slugGenerator.test.ts`)

- Test unique slug generation (default 6 chars)
- Test collision handling with mocked database
- Test automatic length increase after 5 collisions
- Test max retry failure scenario
- **Target: 80%+ coverage**

### 3. Auth Routes (`backend/src/routes/auth.test.ts`)

- `POST /api/auth/register` - successful registration
- `POST /api/auth/register` - duplicate username error
- `POST /api/auth/register` - validation errors
- `GET /api/auth/me` - authenticated request
- `GET /api/auth/me` - unauthenticated request
- **Target: 70%+ coverage**

### 4. Shader Routes (`backend/src/routes/shaders.test.ts`)

- `GET /api/shaders` - list public shaders
- `POST /api/shaders` - create new shader (authenticated)
- `GET /api/shaders/:slug` - get shader by slug
- `PUT /api/shaders/:slug` - update shader (ownership check)
- `DELETE /api/shaders/:slug` - delete shader (ownership check)
- `POST /api/shaders/:slug/clone` - clone shader
- **Target: 70%+ coverage**

## Frontend Tests (Priority Order)

### 5. GLSL Preprocessor (`frontend/src/utils/GLSLPreprocessor.test.ts`)

- Test simple macro expansion (#define constant)
- Test function-like macro expansion
- Test conditional compilation (#ifdef, #ifndef)
- Test #if expression evaluation
- Test nested conditionals
- Test line mapping preservation
- Test error handling (unclosed conditionals, invalid macros)
- **Target: 80%+ coverage**

### 6. GLSL Compiler (`frontend/src/utils/GLSLCompiler.test.ts`)

- Test error parsing (parseShaderError)
- Test multipass error parsing with Common code
- Test error message formatting
- Test mainImage validation
- Test prepareShaderCode with Common code prepending
- Test line number mapping with preprocessor
- **Target: 80%+ coverage**

### 7. Editor Page Helpers (`frontend/src/utils/editorPageHelpers.test.ts`)

- Test `apiShaderToShaderData()` transformation
- Test `distributeErrorsToTabs()` with multipass errors
- Test `determineCompilationStatus()` logic
- Test `sortTabsByCanonicalOrder()`
- **Target: 80%+ coverage**

## Test Infrastructure Setup

### 8. Backend Test Database Configuration

- Create `.env.test` file (if not exists)
- Ensure test database uses separate SQLite file
- Verify testDb helpers work correctly

### 9. Frontend WebGL Mocking

- Verify WebGL context mocking in setup.ts
- Add any missing WebGL2 methods if needed during testing

## Implementation Strategy

1. Start with pure utility functions (JWT, slug generator, preprocessor, compiler helpers) - easiest to test
2. Move to integration tests (API routes with database) - requires setup/teardown
3. Focus on critical paths - authentication flow, shader compilation, error handling
4. Use TDD patterns - Arrange, Act, Assert structure
5. Mock external dependencies - Google OAuth, database for unit tests where appropriate

## Success Criteria

- All tests pass independently and in suite
- Coverage targets met for each module
- Tests demonstrate key functionality works correctly
- Tests catch regressions in critical code paths
- Clear test naming and documentation

## Future Extensions (Not in First Round)

- WebGLRenderer tests (complex WebGL mocking)
- React hook tests (useEditorState)
- Component integration tests
- E2E tests with Playwright