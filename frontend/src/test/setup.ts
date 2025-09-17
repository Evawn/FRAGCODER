import '@testing-library/jest-dom'

// Mock WebGL context for testing
const mockWebGLContext = {
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  deleteShader: vi.fn(),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getProgramInfoLog: vi.fn(() => ''),
  deleteProgram: vi.fn(),
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
}

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLContext
  }
  return null
})

// Mock document.createElement for canvas
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement.call(document, 'canvas') as HTMLCanvasElement
    canvas.getContext = vi.fn((contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return mockWebGLContext
      }
      return null
    })
    return canvas
  }
  return originalCreateElement.call(document, tagName)
}) as any

// Global test utilities
global.mockWebGLContext = mockWebGLContext

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})