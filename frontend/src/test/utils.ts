import { vi } from 'vitest'
import type { CompilationError } from '../utils/GLSLCompiler'

/**
 * Test utilities for GLSL Shader Playground testing
 */

/**
 * Creates a mock WebGL context with configurable behavior
 */
export function createMockWebGLContext(options: {
  shaderCompilationSuccess?: boolean
  programLinkingSuccess?: boolean
  shaderInfoLog?: string
  programInfoLog?: string
} = {}) {
  const {
    shaderCompilationSuccess = true,
    programLinkingSuccess = true,
    shaderInfoLog = '',
    programInfoLog = ''
  } = options

  return {
    // Shader creation
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => shaderCompilationSuccess),
    getShaderInfoLog: vi.fn(() => shaderInfoLog),
    deleteShader: vi.fn(),

    // Program creation and linking
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => programLinkingSuccess),
    getProgramInfoLog: vi.fn(() => programInfoLog),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),

    // Uniform handling
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Attribute handling
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    // Buffer operations
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),

    // Texture operations
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    deleteTexture: vi.fn(),
    activeTexture: vi.fn(),

    // Rendering
    clear: vi.fn(),
    clearColor: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    viewport: vi.fn(),

    // State management
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthFunc: vi.fn(),

    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    NEAREST: 9728,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    REPEAT: 10497,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TRIANGLES: 4,
    POINTS: 0,
    LINES: 1,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    FLOAT: 5126
  }
}

/**
 * Sets up WebGL mocking globally for tests
 */
export function setupWebGLMocking(mockContext = createMockWebGLContext()) {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return mockContext
    }
    return null
  })

  return mockContext
}

/**
 * Creates sample compilation errors for testing
 */
export function createTestErrors(): CompilationError[] {
  return [
    {
      line: 5,
      message: 'Undeclared variable "testVar"',
      type: 'error'
    },
    {
      line: 10,
      message: 'Syntax error near ";"',
      type: 'error'
    },
    {
      line: 15,
      message: 'Variable "unused" might be uninitialized',
      type: 'warning'
    }
  ]
}

/**
 * Sample GLSL shader codes for testing
 */
export const sampleShaders = {
  simple: `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`,

  withUniforms: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(u_time));
  gl_FragColor = vec4(color, 1.0);
}`,

  shadertoyStyle: `
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(iTime));
  gl_FragColor = vec4(color, 1.0);
}`,

  withPrecision: `
precision highp float;

void main() {
  gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
}`,

  withFunctions: `
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float n = noise(uv * 10.0);
  gl_FragColor = vec4(vec3(n), 1.0);
}`,

  withStructs: `
struct Material {
  vec3 color;
  float roughness;
  float metallic;
};

void main() {
  Material mat;
  mat.color = vec3(1.0, 0.0, 0.0);
  mat.roughness = 0.5;
  mat.metallic = 0.0;
  
  gl_FragColor = vec4(mat.color, 1.0);
}`,

  complex: `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  vec3 color = vec3(0.0);
  
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec2 pos = uv * (2.0 + layer * 0.5);
    pos += vec2(sin(u_time * 0.5 + layer), cos(u_time * 0.3 + layer)) * 0.1;
    
    float n = noise(pos);
    float hue = layer / 3.0 + u_time * 0.1;
    vec3 layerColor = hsv2rgb(vec3(hue, 0.8, smoothstep(0.3, 0.7, n)));
    
    color += layerColor * 0.33;
  }
  
  gl_FragColor = vec4(color, 1.0);
}`,

  invalid: {
    undeclaredVariable: `
void main() {
  gl_FragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}`,

    syntaxError: `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)
}`,

    typeMismatch: `
void main() {
  float color = vec3(1.0, 0.0, 0.0);
  gl_FragColor = vec4(color, 1.0);
}`,

    missingFunction: `
void main() {
  float result = nonExistentFunction(1.0);
  gl_FragColor = vec4(result);
}`,

    wrongArguments: `
void main() {
  vec3 result = sin(); // sin requires an argument
  gl_FragColor = vec4(result, 1.0);
}`
  }
}

/**
 * Creates a mock CodeMirror view for testing
 */
export function createMockCodeMirrorView(options: {
  doc?: string
  selection?: { from: number; to: number }
} = {}) {
  const { doc = '', selection = { from: 0, to: 0 } } = options

  return {
    state: {
      doc: {
        toString: () => doc,
        length: doc.length,
        line: (n: number) => ({
          number: n,
          from: 0,
          to: doc.split('\n')[n - 1]?.length || 0,
          text: doc.split('\n')[n - 1] || ''
        }),
        lineAt: (pos: number) => ({
          number: 1,
          from: 0,
          to: doc.length,
          text: doc
        })
      },
      selection: {
        main: selection
      },
      field: vi.fn()
    },
    dispatch: vi.fn(),
    focus: vi.fn(),
    hasFocus: false,
    dom: document.createElement('div'),
    scrollDOM: document.createElement('div'),
    contentDOM: document.createElement('div')
  }
}

/**
 * Simulates typing in a CodeMirror editor
 */
export function simulateTyping(view: any, text: string) {
  const currentDoc = view.state.doc.toString()
  const newDoc = currentDoc + text
  
  view.state.doc.toString = () => newDoc
  view.dispatch.mockImplementation((tr: any) => {
    // Simulate transaction dispatch
    if (tr.changes) {
      // Update document
    }
  })
}

/**
 * Creates test compilation scenarios
 */
export function createCompilationScenarios() {
  return [
    {
      name: 'Valid simple shader',
      code: sampleShaders.simple,
      shouldSucceed: true,
      expectedErrors: []
    },
    {
      name: 'Valid shader with uniforms',
      code: sampleShaders.withUniforms,
      shouldSucceed: true,
      expectedErrors: []
    },
    {
      name: 'Valid Shadertoy-style shader',
      code: sampleShaders.shadertoyStyle,
      shouldSucceed: true,
      expectedErrors: []
    },
    {
      name: 'Shader with undeclared variable',
      code: sampleShaders.invalid.undeclaredVariable,
      shouldSucceed: false,
      expectedErrors: ['Variable not declared', 'undeclared identifier']
    },
    {
      name: 'Shader with syntax error',
      code: sampleShaders.invalid.syntaxError,
      shouldSucceed: false,
      expectedErrors: ['Syntax error', 'syntax error']
    },
    {
      name: 'Shader with type mismatch',
      code: sampleShaders.invalid.typeMismatch,
      shouldSucceed: false,
      expectedErrors: ['Type mismatch', 'cannot convert']
    },
    {
      name: 'Complex shader with functions and structs',
      code: sampleShaders.complex,
      shouldSucceed: true,
      expectedErrors: []
    }
  ]
}

/**
 * Waits for async operations to complete
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Creates a mock canvas element for testing
 */
export function createMockCanvas() {
  const canvas = document.createElement('canvas')
  const mockContext = createMockWebGLContext()
  
  canvas.getContext = vi.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return mockContext
    }
    return null
  })
  
  return { canvas, mockContext }
}

/**
 * Test helper for verifying error message formatting
 */
export function expectErrorMessage(
  error: CompilationError,
  expectedLine: number,
  expectedMessageParts: string[],
  expectedType: 'error' | 'warning' = 'error'
) {
  expect(error.line).toBe(expectedLine)
  expect(error.type).toBe(expectedType)
  
  expectedMessageParts.forEach(part => {
    expect(error.message.toLowerCase()).toContain(part.toLowerCase())
  })
}

/**
 * Performance testing helper
 */
export function measurePerformance<T>(fn: () => T, iterations = 100): {
  result: T
  averageTime: number
  totalTime: number
} {
  const start = performance.now()
  let result: T
  
  for (let i = 0; i < iterations; i++) {
    result = fn()
  }
  
  const end = performance.now()
  const totalTime = end - start
  const averageTime = totalTime / iterations
  
  return {
    result: result!,
    averageTime,
    totalTime
  }
}

/**
 * Memory usage testing helper
 */
export function createMemoryStressTest(
  createObject: () => any,
  iterations = 1000
) {
  const objects: any[] = []
  
  for (let i = 0; i < iterations; i++) {
    objects.push(createObject())
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  return objects
}