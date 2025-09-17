import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  compile, 
  Compile,
  parseShaderError,
  formatErrorMessage,
  prepareShaderCode,
  createShader,
  VERTEX_SHADER_SOURCE,
  FRAGMENT_SHADER_WRAPPER,
  type CompilationError,
  type CompileResult
} from './GLSLCompiler'

declare global {
  var mockWebGLContext: any;
}

describe('GLSLCompiler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatErrorMessage', () => {
    it('should remove quotes from identifiers', () => {
      const message = "'undeclaredVar' : undeclared identifier"
      const formatted = formatErrorMessage(message)
      expect(formatted).toBe('Variable not declared: undeclaredVar : undeclared identifier')
    })

    it('should handle multiple error types', () => {
      const testCases = [
        {
          input: 'undeclared identifier',
          expected: 'Variable not declared: undeclared identifier'
        },
        {
          input: 'no matching overloaded function found',
          expected: 'Function call with wrong arguments: no matching overloaded function found'
        },
        {
          input: 'cannot convert from',
          expected: 'Type mismatch: cannot convert from'
        },
        {
          input: 'vector field selection out of range',
          expected: 'Invalid vector component (use xyzw or rgba): vector field selection out of range'
        },
        {
          input: 'unknown error type',
          expected: 'unknown error type'
        }
      ]

      testCases.forEach(({ input, expected }) => {
        expect(formatErrorMessage(input)).toBe(expected)
      })
    })
  })

  describe('parseShaderError', () => {
    it('should parse standard WebGL error format', () => {
      const errorLog = "ERROR: 0:15: 'undeclaredVar' : undeclared identifier"
      const errors = parseShaderError(errorLog, 10)
      
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 5, // 15 - 10
        message: "Variable not declared: undeclaredVar : undeclared identifier",
        type: 'error'
      })
    })

    it('should handle negative userCodeStartLine for uniform insertion', () => {
      const errorLog = "ERROR: 0:25: 'someVar' : undeclared identifier"
      const errors = parseShaderError(errorLog, -5) // Uniforms inserted after line 5
      
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 15, // 25 - 10 (uniform lines)
        message: "Variable not declared: someVar : undeclared identifier",
        type: 'error'
      })
    })

    it('should handle errors before uniform insertion point', () => {
      const errorLog = "ERROR: 0:3: syntax error"
      const errors = parseShaderError(errorLog, -5)
      
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 3, // Before insertion point, use original line
        message: "Syntax error: syntax error",
        type: 'error'
      })
    })

    it('should parse warnings', () => {
      const errorLog = "WARNING: 0:10: 'variable' : might be uninitialized"
      const errors = parseShaderError(errorLog, 5)
      
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 5, // 10 - 5
        message: "variable : might be uninitialized",
        type: 'warning'
      })
    })

    it('should handle multiple errors', () => {
      const errorLog = `ERROR: 0:10: 'var1' : undeclared identifier
WARNING: 0:15: 'var2' : might be uninitialized
ERROR: 0:20: syntax error`
      const errors = parseShaderError(errorLog, 5)
      
      expect(errors).toHaveLength(3)
      expect(errors[0].type).toBe('error')
      expect(errors[1].type).toBe('warning')
      expect(errors[2].type).toBe('error')
    })

    it('should handle generic errors without line numbers', () => {
      const errorLog = "Failed to compile shader"
      const errors = parseShaderError(errorLog, 0)
      
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        line: 0,
        message: "Failed to compile shader",
        type: 'error'
      })
    })

    it('should ensure minimum line number of 1', () => {
      const errorLog = "ERROR: 0:2: syntax error"
      const errors = parseShaderError(errorLog, 10) // Would result in negative line
      
      expect(errors[0].line).toBe(1)
    })
  })

  describe('prepareShaderCode', () => {
    it('should wrap code without precision declaration', () => {
      const userCode = `
void main() {
  gl_FragColor = vec4(1.0);
}`
      const result = prepareShaderCode(userCode)
      
      expect(result.code).toContain('precision mediump float;')
      expect(result.code).toContain('uniform vec2 u_resolution;')
      expect(result.code).toContain(userCode)
      expect(result.userCodeStartLine).toBeGreaterThan(0)
    })

    it('should preserve existing precision declaration', () => {
      const userCode = `precision highp float;

void main() {
  gl_FragColor = vec4(1.0);
}`
      const result = prepareShaderCode(userCode)
      
      expect(result.code).toBe(userCode)
      expect(result.userCodeStartLine).toBe(0)
    })

    it('should add uniforms after precision if missing', () => {
      const userCode = `precision highp float;

void main() {
  gl_FragColor = vec4(1.0);
}`
      const result = prepareShaderCode(userCode)
      
      expect(result.code).toContain('precision highp float;')
      expect(result.code).toContain('uniform vec2 u_resolution;')
      expect(result.userCodeStartLine).toBeLessThan(0) // Indicates insertion
    })

    it('should not add uniforms if already present', () => {
      const userCode = `precision highp float;
uniform vec2 u_resolution;

void main() {
  gl_FragColor = vec4(1.0);
}`
      const result = prepareShaderCode(userCode)
      
      expect(result.code).toBe(userCode)
      expect(result.userCodeStartLine).toBe(0)
    })

    it('should handle precision at different positions', () => {
      const userCode = `// Comment
precision mediump float;
// Another comment

void main() {
  gl_FragColor = vec4(1.0);
}`
      const result = prepareShaderCode(userCode)
      
      expect(result.code).toContain('precision mediump float;')
      expect(result.code).toContain('uniform vec2 u_resolution;')
    })
  })

  describe('createShader', () => {
    beforeEach(() => {
      global.mockWebGLContext.createShader.mockReturnValue({})
      global.mockWebGLContext.getShaderParameter.mockReturnValue(true)
    })

    it('should create shader successfully', () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') as WebGLRenderingContext
      const shader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
      
      expect(shader).toBeDefined()
      expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER)
      expect(gl.shaderSource).toHaveBeenCalled()
      expect(gl.compileShader).toHaveBeenCalled()
    })

    it('should handle createShader failure', () => {
      global.mockWebGLContext.createShader.mockReturnValue(null)
      
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') as WebGLRenderingContext
      const shader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
      
      expect(shader).toBeNull()
    })

    it('should handle compilation failure', () => {
      global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
      global.mockWebGLContext.getShaderInfoLog.mockReturnValue('Compilation error')
      
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') as WebGLRenderingContext
      
      expect(() => {
        createShader(gl, gl.VERTEX_SHADER, 'invalid shader code')
      }).toThrow('Compilation error')
      
      expect(gl.deleteShader).toHaveBeenCalled()
    })
  })

  describe('compile function', () => {
    beforeEach(() => {
      // Reset WebGL mocks to success state
      global.mockWebGLContext.createShader.mockReturnValue({})
      global.mockWebGLContext.createProgram.mockReturnValue({})
      global.mockWebGLContext.getShaderParameter.mockReturnValue(true)
      global.mockWebGLContext.getProgramParameter.mockReturnValue(true)
      global.mockWebGLContext.getShaderInfoLog.mockReturnValue('')
      global.mockWebGLContext.getProgramInfoLog.mockReturnValue('')
    })

    describe('Basic functionality', () => {
      it('should compile valid simple shader', () => {
        const code = `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.code).toBe(code)
      })

      it('should handle empty shader code', () => {
        const result = compile('')
        
        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toBe('Shader code is empty')
      })

      it('should handle whitespace-only code', () => {
        const result = compile('   \n\t  ')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toBe('Shader code is empty')
      })
    })

    describe('WebGL context handling', () => {
      it('should handle WebGL not supported', () => {
        // Mock canvas.getContext to return null
        const originalGetContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
        
        const result = compile('void main() {}')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toBe('WebGL is not supported in your browser')
        
        // Restore original
        HTMLCanvasElement.prototype.getContext = originalGetContext
      })
    })

    describe('Shader compilation errors', () => {
      it('should handle fragment shader compilation failure', () => {
        // Mock fragment shader compilation to fail
        global.mockWebGLContext.getShaderParameter
          .mockReturnValueOnce(true)  // vertex shader succeeds
          .mockReturnValueOnce(false) // fragment shader fails
        global.mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:15: 'undeclaredVar' : undeclared identifier")
        
        const code = `
void main() {
  gl_FragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toContain('Variable not declared')
      })

      it('should handle vertex shader compilation failure', () => {
        global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
        global.mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:2: syntax error")
        
        const result = compile('void main() { gl_FragColor = vec4(1.0); }')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toContain('Syntax error')
      })
    })

    describe('Program linking errors', () => {
      it('should handle program linking failure', () => {
        global.mockWebGLContext.getProgramParameter.mockReturnValue(false)
        global.mockWebGLContext.getProgramInfoLog.mockReturnValue("Linking failed: varying mismatch")
        
        const result = compile('void main() { gl_FragColor = vec4(1.0); }')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toContain('Linking failed')
      })

      it('should handle createProgram failure', () => {
        global.mockWebGLContext.createProgram.mockReturnValue(null)
        
        const result = compile('void main() { gl_FragColor = vec4(1.0); }')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toBe('Failed to create shader program')
      })
    })

    describe('Complex shader scenarios', () => {
      it('should compile shader using standard uniforms', () => {
        const code = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(u_time));
  gl_FragColor = vec4(color, 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
      })

      it('should compile Shadertoy-style shader', () => {
        const code = `
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(iTime));
  gl_FragColor = vec4(color, 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
      })

      it('should handle shader with custom precision', () => {
        const code = `precision highp float;

void main() {
  gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
      })

      it('should handle complex mathematical operations', () => {
        const code = `
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float n = noise(uv * 10.0);
  gl_FragColor = vec4(vec3(n), 1.0);
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
      })

      it('should handle shader with user-defined structs', () => {
        const code = `
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
}`
        const result = compile(code)
        
        expect(result.success).toBe(true)
      })
    })

    describe('Error recovery and edge cases', () => {
      it('should handle multiple simultaneous errors', () => {
        global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
        global.mockWebGLContext.getShaderInfoLog.mockReturnValue(`
ERROR: 0:10: 'var1' : undeclared identifier
ERROR: 0:15: 'var2' : undeclared identifier
WARNING: 0:20: 'var3' : might be uninitialized
`)
        
        const result = compile('invalid shader with multiple errors')
        
        expect(result.success).toBe(false)
        expect(result.errors.length).toBeGreaterThan(1)
      })

      it('should handle unexpected exceptions', () => {
        global.mockWebGLContext.createShader.mockImplementation(() => {
          throw new Error('Unexpected WebGL error')
        })
        
        const result = compile('void main() {}')
        
        expect(result.success).toBe(false)
        expect(result.errors[0].message).toContain('Unexpected WebGL error')
      })

      it('should cleanup resources on success', () => {
        const result = compile('void main() { gl_FragColor = vec4(1.0); }')
        
        expect(result.success).toBe(true)
        expect(global.mockWebGLContext.deleteProgram).toHaveBeenCalled()
        expect(global.mockWebGLContext.deleteShader).toHaveBeenCalledTimes(2) // vertex + fragment
      })

      it('should cleanup resources on failure', () => {
        global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
        global.mockWebGLContext.getShaderInfoLog.mockReturnValue('Error')
        
        const result = compile('invalid shader')
        
        expect(result.success).toBe(false)
        expect(global.mockWebGLContext.deleteShader).toHaveBeenCalled()
      })
    })

    describe('Backward compatibility', () => {
      it('should export Compile function that is identical to compile', () => {
        expect(Compile).toBe(compile)
      })

      it('should maintain consistent API', () => {
        const code = 'void main() { gl_FragColor = vec4(1.0); }'
        const result1 = compile(code)
        const result2 = Compile(code)
        
        expect(result1).toEqual(result2)
      })
    })

    describe('Performance and memory', () => {
      it('should handle large shader code', () => {
        const largeCode = `
// Large shader with many functions
${Array.from({ length: 100 }, (_, i) => `
float func${i}(vec2 p) {
  return sin(p.x * ${i + 1}.0) * cos(p.y * ${i + 1}.0);
}
`).join('\n')}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float result = func0(uv);
  gl_FragColor = vec4(vec3(result), 1.0);
}`
        
        const result = compile(largeCode)
        expect(result.success).toBe(true)
      })

      it('should handle repeated compilation calls', () => {
        const code = 'void main() { gl_FragColor = vec4(1.0); }'
        
        for (let i = 0; i < 10; i++) {
          const result = compile(code)
          expect(result.success).toBe(true)
        }
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should properly map line numbers in wrapped shaders', () => {
      global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
      global.mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:25: 'undeclaredVar' : undeclared identifier")
      
      const userCode = `
void main() {
  // This is line 3 in user code
  gl_FragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}`
      
      const result = compile(userCode)
      
      expect(result.success).toBe(false)
      // The error should be mapped to the correct line in user code
      const errorLine = result.errors[0].line
      expect(errorLine).toBeGreaterThan(0)
      expect(errorLine).toBeLessThan(10) // Should be within user code range
    })

    it('should handle precision insertion line mapping', () => {
      global.mockWebGLContext.getShaderParameter.mockReturnValue(false)
      global.mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:15: 'undeclaredVar' : undeclared identifier")
      
      const userCode = `precision highp float;
// Line 2
void main() {
  // This should map correctly despite uniform insertion
  gl_FragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}`
      
      const result = compile(userCode)
      
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      // Error line should be reasonable for user code
      expect(result.errors[0].line).toBeGreaterThan(0)
    })
  })
})