import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { compile } from '../utils/GLSLCompiler'
import CodeMirrorEditor from '../components/CodeMirrorEditor'
import { 
  setupWebGLMocking, 
  createTestErrors, 
  sampleShaders,
  createCompilationScenarios,
  expectErrorMessage,
  measurePerformance,
  waitForAsync
} from './utils'
import type { CompilationError } from '../utils/GLSLCompiler'

// Mock CodeMirror and its dependencies
vi.mock('@uiw/react-codemirror', () => ({
  default: vi.fn(({ value, onChange, onKeyDown, ...props }) => {
    return (
      <div data-testid="codemirror-mock">
        <textarea
          data-testid="codemirror-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={props.placeholder}
          readOnly={props.readOnly}
          {...props}
        />
      </div>
    )
  })
}))

// Mock all CodeMirror extensions
vi.mock('@codemirror/view', () => ({
  EditorView: {
    theme: vi.fn(() => ({})),
    lineWrapping: {},
    decorations: { from: vi.fn() }
  },
  keymap: { of: vi.fn(() => ({})) },
  Decoration: {
    none: {},
    set: vi.fn(() => ({})),
    line: vi.fn(() => ({ range: vi.fn() })),
    widget: vi.fn(() => ({ range: vi.fn() }))
  },
  WidgetType: class MockWidgetType {
    toDOM() { return document.createElement('div') }
    get estimatedHeight() { return 20 }
  },
  lineNumbers: vi.fn(() => ({})),
  highlightActiveLineGutter: vi.fn(() => ({}))
}))

vi.mock('@codemirror/state', () => ({
  StateField: { define: vi.fn(() => ({})) },
  StateEffect: { define: vi.fn(() => ({ of: vi.fn() })) }
}))

vi.mock('@codemirror/language', () => ({
  indentOnInput: vi.fn(() => ({})),
  bracketMatching: vi.fn(() => ({})),
  foldGutter: vi.fn(() => ({})),
  codeFolding: vi.fn(() => ({})),
  indentUnit: { of: vi.fn(() => ({})) }
}))

vi.mock('@codemirror/autocomplete', () => ({
  completionStatus: vi.fn(() => 'inactive'),
  acceptCompletion: vi.fn()
}))

vi.mock('@codemirror/commands', () => ({
  indentMore: vi.fn(),
  insertNewlineAndIndent: vi.fn(),
  selectAll: vi.fn(),
  cursorDocStart: vi.fn(),
  cursorDocEnd: vi.fn(),
  cursorLineStart: vi.fn(),
  cursorLineEnd: vi.fn(),
  deleteCharBackward: vi.fn(),
  deleteCharForward: vi.fn()
}))

vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: {} }))
vi.mock('../utils/GLSLLanguage', () => ({ glsl: vi.fn(() => ({})) }))

describe('GLSL Editor Environment Integration Tests', () => {
  let mockWebGLContext: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockWebGLContext = setupWebGLMocking()
  })

  describe('Complete Development Workflow', () => {
    it('should support a complete shader development cycle', async () => {
      const user = userEvent.setup()
      let currentCode = ''
      let compilationResult: any = null
      let currentErrors: CompilationError[] = []

      const onCodeChange = vi.fn((code: string) => {
        currentCode = code
      })

      const onCompile = vi.fn(() => {
        compilationResult = compile(currentCode)
        currentErrors = compilationResult.errors
      })

      const { rerender } = render(
        <CodeMirrorEditor
          value={currentCode}
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={currentErrors}
          compilationSuccess={compilationResult?.success}
        />
      )

      // Step 1: Start with empty editor
      expect(screen.getByTestId('codemirror-textarea')).toHaveValue('')

      // Step 2: Write initial shader code (with error)
      const invalidCode = sampleShaders.invalid.undeclaredVariable
      fireEvent.change(screen.getByTestId('codemirror-textarea'), {
        target: { value: invalidCode }
      })
      onCodeChange(invalidCode)
      currentCode = invalidCode

      // Step 3: Compile and get errors
      mockWebGLContext.getShaderParameter.mockReturnValue(false)
      mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:15: 'undeclaredVar' : undeclared identifier")
      
      await user.keyboard('{Control>}s{/Control}')
      expect(onCompile).toHaveBeenCalled()
      
      onCompile()
      expect(compilationResult.success).toBe(false)
      expect(compilationResult.errors.length).toBeGreaterThan(0)

      // Update component with errors
      rerender(
        <CodeMirrorEditor
          value={currentCode}
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={compilationResult.errors}
          compilationSuccess={false}
        />
      )

      // Verify error state is shown
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('border-red-500')

      // Step 4: Fix the error
      mockWebGLContext.getShaderParameter.mockReturnValue(true)
      
      const fixedCode = sampleShaders.simple
      fireEvent.change(screen.getByTestId('codemirror-textarea'), {
        target: { value: fixedCode }
      })
      onCodeChange(fixedCode)
      currentCode = fixedCode

      // Step 5: Compile successfully
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      onCompile()
      compilationResult = compile(currentCode)
      
      expect(compilationResult.success).toBe(true)
      expect(compilationResult.errors).toHaveLength(0)

      // Update component with success
      rerender(
        <CodeMirrorEditor
          value={currentCode}
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={[]}
          compilationSuccess={true}
        />
      )

      // Verify success state is shown
      expect(container).toHaveClass('border-green-500')
    })

    it('should handle iterative development with multiple edits', async () => {
      const user = userEvent.setup()
      const onCodeChange = vi.fn()
      const onCompile = vi.fn()

      render(
        <CodeMirrorEditor
          value=""
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={[]}
        />
      )

      const textarea = screen.getByTestId('codemirror-textarea')
      
      // Simulate iterative development
      const edits = [
        'void main() {',
        'void main() {\n  gl_FragColor',
        'void main() {\n  gl_FragColor = vec4',
        'void main() {\n  gl_FragColor = vec4(1.0',
        'void main() {\n  gl_FragColor = vec4(1.0, 0.0',
        'void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0',
        'void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0',
        'void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
        'void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}'
      ]

      for (const edit of edits) {
        fireEvent.change(textarea, { target: { value: edit } })
        expect(onCodeChange).toHaveBeenCalledWith(edit)
        
        // Simulate compilation at key points
        if (edit.includes('}')) {
          await user.keyboard('{Control>}s{/Control}')
          expect(onCompile).toHaveBeenCalled()
        }
      }

      expect(onCodeChange).toHaveBeenCalledTimes(edits.length)
    })
  })

  describe('Error Recovery and Correction', () => {
    it('should handle error-to-success-to-error cycles', async () => {
      const scenarios = [
        { code: sampleShaders.invalid.syntaxError, expectSuccess: false },
        { code: sampleShaders.simple, expectSuccess: true },
        { code: sampleShaders.invalid.typeMismatch, expectSuccess: false },
        { code: sampleShaders.withUniforms, expectSuccess: true },
        { code: sampleShaders.invalid.undeclaredVariable, expectSuccess: false },
        { code: sampleShaders.complex, expectSuccess: true }
      ]

      for (const scenario of scenarios) {
        // Set up WebGL mock based on expected result
        mockWebGLContext.getShaderParameter.mockReturnValue(scenario.expectSuccess)
        if (!scenario.expectSuccess) {
          mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:10: test error")
        }

        const result = compile(scenario.code)
        expect(result.success).toBe(scenario.expectSuccess)
        
        if (scenario.expectSuccess) {
          expect(result.errors).toHaveLength(0)
        } else {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      }
    })

    it('should preserve editor state during error corrections', async () => {
      const user = userEvent.setup()
      const onCodeChange = vi.fn()
      const onCompile = vi.fn()

      const { rerender } = render(
        <CodeMirrorEditor
          value={sampleShaders.invalid.undeclaredVariable}
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={createTestErrors()}
          compilationSuccess={false}
        />
      )

      const textarea = screen.getByTestId('codemirror-textarea')
      
      // Verify initial error state
      expect(textarea).toHaveValue(sampleShaders.invalid.undeclaredVariable)
      
      // Make correction
      const correctedCode = sampleShaders.simple
      fireEvent.change(textarea, { target: { value: correctedCode } })

      // Verify state is maintained
      expect(onCodeChange).toHaveBeenCalledWith(correctedCode)
      
      // Update with success state
      rerender(
        <CodeMirrorEditor
          value={correctedCode}
          onChange={onCodeChange}
          onCompile={onCompile}
          errors={[]}
          compilationSuccess={true}
        />
      )

      // Verify editor still works
      expect(textarea).toHaveValue(correctedCode)
    })
  })

  describe('Keyboard Shortcuts and User Experience', () => {
    it('should support all compilation keyboard shortcuts', async () => {
      const user = userEvent.setup()
      const onCompile = vi.fn()

      render(
        <CodeMirrorEditor
          value={sampleShaders.simple}
          onChange={vi.fn()}
          onCompile={onCompile}
          errors={[]}
        />
      )

      const textarea = screen.getByTestId('codemirror-textarea')
      await user.click(textarea)

      // Test Shift+Enter
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      expect(onCompile).toHaveBeenCalledTimes(1)

      // Test Ctrl+S
      await user.keyboard('{Control>}s{/Control}')
      expect(onCompile).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid keyboard input without performance issues', async () => {
      const user = userEvent.setup()
      const onCodeChange = vi.fn()

      render(
        <CodeMirrorEditor
          value=""
          onChange={onCodeChange}
          onCompile={vi.fn()}
          errors={[]}
        />
      )

      const textarea = screen.getByTestId('codemirror-textarea')
      
      // Simulate rapid typing
      const rapidText = 'float test = 1.0;'
      for (const char of rapidText) {
        fireEvent.change(textarea, { 
          target: { value: textarea.value + char } 
        })
      }

      // Should handle all changes
      expect(onCodeChange).toHaveBeenCalledTimes(rapidText.length)
    })
  })

  describe('Performance Testing', () => {
    it('should compile shaders efficiently', () => {
      const { averageTime } = measurePerformance(() => {
        return compile(sampleShaders.simple)
      }, 100)

      // Compilation should be fast (< 10ms on average)
      expect(averageTime).toBeLessThan(10)
    })

    it('should handle large shader codes efficiently', () => {
      const largeShader = sampleShaders.complex
      
      const { averageTime } = measurePerformance(() => {
        return compile(largeShader)
      }, 50)

      // Even large shaders should compile reasonably fast
      expect(averageTime).toBeLessThan(50)
    })

    it('should handle many errors efficiently', () => {
      // Create shader with multiple potential error points
      mockWebGLContext.getShaderParameter.mockReturnValue(false)
      mockWebGLContext.getShaderInfoLog.mockReturnValue(`
ERROR: 0:10: 'var1' : undeclared identifier
ERROR: 0:15: 'var2' : undeclared identifier
ERROR: 0:20: 'var3' : undeclared identifier
WARNING: 0:25: 'var4' : might be uninitialized
ERROR: 0:30: syntax error
WARNING: 0:35: 'var5' : unused variable
ERROR: 0:40: 'var6' : undeclared identifier
`)

      const { averageTime } = measurePerformance(() => {
        return compile('invalid shader with many errors')
      }, 50)

      // Error parsing should still be fast
      expect(averageTime).toBeLessThan(20)
    })
  })

  describe('Memory Management', () => {
    it('should properly cleanup WebGL resources', () => {
      // Test successful compilation cleanup
      compile(sampleShaders.simple)
      
      expect(mockWebGLContext.deleteProgram).toHaveBeenCalled()
      expect(mockWebGLContext.deleteShader).toHaveBeenCalledTimes(2)
    })

    it('should cleanup resources even on failure', () => {
      mockWebGLContext.getShaderParameter.mockReturnValue(false)
      mockWebGLContext.getShaderInfoLog.mockReturnValue('Compilation error')
      
      compile(sampleShaders.invalid.syntaxError)
      
      expect(mockWebGLContext.deleteShader).toHaveBeenCalled()
    })

    it('should handle repeated compilation without memory leaks', () => {
      // Compile many times to test for memory leaks
      for (let i = 0; i < 100; i++) {
        compile(sampleShaders.simple)
      }

      // Should have cleaned up resources each time
      expect(mockWebGLContext.deleteProgram).toHaveBeenCalledTimes(100)
      expect(mockWebGLContext.deleteShader).toHaveBeenCalledTimes(200) // 2 per compilation
    })
  })

  describe('Edge Cases and Error Resilience', () => {
    it('should handle WebGL context loss gracefully', () => {
      // Simulate WebGL context not available
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
      
      const result = compile(sampleShaders.simple)
      
      expect(result.success).toBe(false)
      expect(result.errors[0].message).toBe('WebGL is not supported in your browser')
    })

    it('should handle unexpected WebGL errors', () => {
      mockWebGLContext.createShader.mockImplementation(() => {
        throw new Error('WebGL context lost')
      })
      
      const result = compile(sampleShaders.simple)
      
      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('WebGL context lost')
    })

    it('should handle malformed error logs', () => {
      mockWebGLContext.getShaderParameter.mockReturnValue(false)
      mockWebGLContext.getShaderInfoLog.mockReturnValue('Malformed error log without line numbers')
      
      const result = compile(sampleShaders.invalid.syntaxError)
      
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].line).toBe(0) // Generic error
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle typical shader development patterns', async () => {
      const scenarios = createCompilationScenarios()
      
      for (const scenario of scenarios) {
        if (scenario.shouldSucceed) {
          mockWebGLContext.getShaderParameter.mockReturnValue(true)
        } else {
          mockWebGLContext.getShaderParameter.mockReturnValue(false)
          mockWebGLContext.getShaderInfoLog.mockReturnValue(
            `ERROR: 0:10: ${scenario.expectedErrors[0] || 'test error'}`
          )
        }

        const result = compile(scenario.code)
        
        expect(result.success).toBe(scenario.shouldSucceed)
        
        if (!scenario.shouldSucceed) {
          expect(result.errors.length).toBeGreaterThan(0)
          scenario.expectedErrors.forEach(expectedError => {
            const hasError = result.errors.some(error => 
              error.message.toLowerCase().includes(expectedError.toLowerCase())
            )
            expect(hasError).toBe(true)
          })
        }
      }
    })

    it('should support complex multi-pass shader development', async () => {
      const passes = [
        { code: 'void main() {', expectError: true },
        { code: 'void main() {\n  vec2 uv', expectError: true },
        { code: 'void main() {\n  vec2 uv = gl_FragCoord.xy', expectError: true },
        { code: 'void main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;', expectError: true },
        { code: 'void main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n  gl_FragColor', expectError: true },
        { code: 'void main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n  gl_FragColor = vec4(uv, 0.0, 1.0);', expectError: true },
        { code: 'void main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n  gl_FragColor = vec4(uv, 0.0, 1.0);\n}', expectError: false }
      ]

      for (let i = 0; i < passes.length; i++) {
        const pass = passes[i]
        
        mockWebGLContext.getShaderParameter.mockReturnValue(!pass.expectError)
        if (pass.expectError) {
          mockWebGLContext.getShaderInfoLog.mockReturnValue("ERROR: 0:10: syntax error")
        }

        const result = compile(pass.code)
        expect(result.success).toBe(!pass.expectError)
      }
    })

    it('should maintain performance under stress', async () => {
      const stressTest = async () => {
        const editor = render(
          <CodeMirrorEditor
            value=""
            onChange={vi.fn()}
            onCompile={vi.fn()}
            errors={[]}
          />
        )

        // Rapid prop changes
        for (let i = 0; i < 50; i++) {
          editor.rerender(
            <CodeMirrorEditor
              value={`// Iteration ${i}\n${sampleShaders.simple}`}
              onChange={vi.fn()}
              onCompile={vi.fn()}
              errors={i % 2 === 0 ? createTestErrors() : []}
              compilationSuccess={i % 3 === 0}
            />
          )
          
          await waitForAsync(1)
        }

        editor.unmount()
      }

      const { averageTime } = measurePerformance(stressTest, 5)
      
      // Stress test should complete in reasonable time
      expect(averageTime).toBeLessThan(1000) // 1 second
    })
  })
})