// Global test setup - runs once before all test files
// Configures DOM testing environment and provides custom matchers

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Automatically cleanup after each test to prevent memory leaks
afterEach(() => {
  cleanup();
});

// Mock WebGL context for tests (since jsdom doesn't support WebGL)
// This prevents "getContext('webgl2') is null" errors in tests
const mockWebGLContext = {
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getProgramInfoLog: vi.fn(() => ''),
  useProgram: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  getUniformLocation: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  drawArrays: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  // Add WebGL2-specific methods
  getFragDataLocation: vi.fn(),
  uniform1ui: vi.fn(),
  uniform2ui: vi.fn(),
  uniform3ui: vi.fn(),
  uniform4ui: vi.fn(),
};

// Override HTMLCanvasElement.getContext to return mock WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return mockWebGLContext;
  }
  return null;
}) as typeof HTMLCanvasElement.prototype.getContext;

// Mock window.matchMedia (used by some UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console errors in tests (optional - comment out if you want to see errors)
// global.console.error = vi.fn();
// global.console.warn = vi.fn();
