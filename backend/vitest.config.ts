// Vitest configuration for backend testing - API routes, middleware, and utilities

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use Node environment (not jsdom - we're testing backend code)
    environment: 'node',

    // Setup file runs before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Global test utilities (describe, it, expect, etc.)
    globals: true,

    // Run test files sequentially to avoid database conflicts
    fileParallelism: false,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'prisma/',
      ],
    },

    // Exclude these patterns from test discovery
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],

    // Increase timeout for database operations
    testTimeout: 10000,
  },

  // Path aliases (must match tsconfig.json)
  resolve: {
    alias: {
      '@fragcoder/shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
});
