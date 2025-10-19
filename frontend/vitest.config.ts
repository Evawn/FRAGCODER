// Vitest configuration for frontend testing - React components, hooks, and utilities

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment for DOM APIs (required for React Testing Library)
    environment: 'jsdom',

    // Setup file runs before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Global test utilities (describe, it, expect, etc.) - no need to import in every test
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/',
      ],
    },

    // Exclude these patterns from test discovery
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },

  // Path aliases (must match tsconfig.app.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fragcoder/shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
});
