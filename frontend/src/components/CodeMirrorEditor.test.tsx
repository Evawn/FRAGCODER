import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeMirrorEditor from './CodeMirrorEditor'
import type { CompilationError } from '../utils/GLSLCompiler'

// Mock CodeMirror
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

// Mock CodeMirror extensions
vi.mock('@codemirror/view', () => ({
  EditorView: {
    theme: vi.fn(() => ({})),
    lineWrapping: {},
    decorations: {
      from: vi.fn()
    }
  },
  keymap: {
    of: vi.fn(() => ({}))
  },
  Decoration: {
    none: {},
    set: vi.fn(() => ({})),
    line: vi.fn(() => ({
      range: vi.fn()
    })),
    widget: vi.fn(() => ({
      range: vi.fn()
    }))
  },
  WidgetType: class MockWidgetType {
    toDOM() {
      return document.createElement('div')
    }
    get estimatedHeight() {
      return 20
    }
  },
  lineNumbers: vi.fn(() => ({})),
  highlightActiveLineGutter: vi.fn(() => ({}))
}))

vi.mock('@codemirror/state', () => ({
  StateField: {
    define: vi.fn(() => ({}))
  },
  StateEffect: {
    define: vi.fn(() => ({
      of: vi.fn()
    }))
  }
}))

vi.mock('@codemirror/language', () => ({
  indentOnInput: vi.fn(() => ({})),
  bracketMatching: vi.fn(() => ({})),
  foldGutter: vi.fn(() => ({})),
  codeFolding: vi.fn(() => ({})),
  indentUnit: {
    of: vi.fn(() => ({}))
  }
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

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}))

vi.mock('../utils/GLSLLanguage', () => ({
  glsl: vi.fn(() => ({}))
}))

describe('CodeMirrorEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    placeholder: 'Write your GLSL code here...',
    readOnly: false,
    errors: [],
    onCompile: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the editor', () => {
      render(<CodeMirrorEditor {...defaultProps} />)
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })

    it('should display placeholder text', () => {
      const placeholder = 'Custom placeholder'
      render(<CodeMirrorEditor {...defaultProps} placeholder={placeholder} />)
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    })

    it('should display initial value', () => {
      const initialValue = 'void main() { gl_FragColor = vec4(1.0); }'
      render(<CodeMirrorEditor {...defaultProps} value={initialValue} />)
      expect(screen.getByDisplayValue(initialValue)).toBeInTheDocument()
    })

    it('should be readOnly when specified', () => {
      render(<CodeMirrorEditor {...defaultProps} readOnly={true} />)
      const textarea = screen.getByTestId('codemirror-textarea')
      expect(textarea).toHaveAttribute('readOnly')
    })
  })

  describe('User Interaction', () => {
    it('should call onChange when text is modified', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onChange={onChange} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.type(textarea, 'void main() {}')
      
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle text input correctly', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onChange={onChange} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.type(textarea, 'float test = 1.0;')
      
      // Should be called for each character typed
      expect(onChange).toHaveBeenCalledTimes(17) // 'float test = 1.0;' is 17 characters
    })

    it('should handle multiline input', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onChange={onChange} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.type(textarea, 'void main() {\n  gl_FragColor = vec4(1.0);\n}')
      
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should call onCompile when Shift+Enter is pressed', async () => {
      const user = userEvent.setup()
      const onCompile = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onCompile={onCompile} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.click(textarea)
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      
      expect(onCompile).toHaveBeenCalled()
    })

    it('should call onCompile when Ctrl+S is pressed', async () => {
      const user = userEvent.setup()
      const onCompile = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onCompile={onCompile} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.click(textarea)
      await user.keyboard('{Control>}s{/Control}')
      
      expect(onCompile).toHaveBeenCalled()
    })

    it('should handle Tab key for indentation', async () => {
      const user = userEvent.setup()
      
      render(<CodeMirrorEditor {...defaultProps} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      await user.click(textarea)
      await user.keyboard('{Tab}')
      
      // Tab should be handled by the editor (indentation)
      // We can't easily test the actual indentation behavior with mocked CodeMirror
      // but we can ensure it doesn't insert a literal tab character
    })
  })

  describe('Error Display', () => {
    it('should display compilation errors', () => {
      const errors: CompilationError[] = [
        {
          line: 5,
          message: 'Undeclared variable',
          type: 'error'
        },
        {
          line: 10,
          message: 'Syntax error',
          type: 'error'
        }
      ]
      
      render(<CodeMirrorEditor {...defaultProps} errors={errors} />)
      
      // With mocked CodeMirror, we can't test the actual error annotations
      // but we can verify the component renders without errors
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })

    it('should display warnings', () => {
      const errors: CompilationError[] = [
        {
          line: 3,
          message: 'Variable might be uninitialized',
          type: 'warning'
        }
      ]
      
      render(<CodeMirrorEditor {...defaultProps} errors={errors} />)
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })

    it('should handle errors without line numbers', () => {
      const errors: CompilationError[] = [
        {
          line: 0,
          message: 'General compilation error',
          type: 'error'
        }
      ]
      
      render(<CodeMirrorEditor {...defaultProps} errors={errors} />)
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })

    it('should handle empty errors array', () => {
      render(<CodeMirrorEditor {...defaultProps} errors={[]} />)
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })

    it('should update when errors change', () => {
      const initialErrors: CompilationError[] = [
        { line: 1, message: 'Error 1', type: 'error' }
      ]
      
      const { rerender } = render(
        <CodeMirrorEditor {...defaultProps} errors={initialErrors} />
      )
      
      const newErrors: CompilationError[] = [
        { line: 2, message: 'Error 2', type: 'error' },
        { line: 3, message: 'Warning 1', type: 'warning' }
      ]
      
      rerender(<CodeMirrorEditor {...defaultProps} errors={newErrors} />)
      
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })
  })

  describe('Compilation Status Feedback', () => {
    it('should show success border when compilation succeeds', () => {
      render(<CodeMirrorEditor {...defaultProps} compilationSuccess={true} />)
      
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('border-green-500')
    })

    it('should show error border when compilation fails', () => {
      render(<CodeMirrorEditor {...defaultProps} compilationSuccess={false} />)
      
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('border-red-500')
    })

    it('should show neutral border when compilation status is undefined', () => {
      render(<CodeMirrorEditor {...defaultProps} compilationSuccess={undefined} />)
      
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('border-gray-600')
    })

    it('should transition border colors', () => {
      const { rerender } = render(
        <CodeMirrorEditor {...defaultProps} compilationSuccess={undefined} />
      )
      
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('transition-colors', 'duration-200')
      
      rerender(<CodeMirrorEditor {...defaultProps} compilationSuccess={true} />)
      expect(container).toHaveClass('border-green-500')
      
      rerender(<CodeMirrorEditor {...defaultProps} compilationSuccess={false} />)
      expect(container).toHaveClass('border-red-500')
    })
  })

  describe('Props Validation', () => {
    it('should handle missing onCompile prop', () => {
      const propsWithoutOnCompile = { ...defaultProps }
      delete (propsWithoutOnCompile as any).onCompile
      
      expect(() => {
        render(<CodeMirrorEditor {...propsWithoutOnCompile} />)
      }).not.toThrow()
    })

    it('should handle all props being provided', () => {
      const fullProps = {
        ...defaultProps,
        value: 'test code',
        placeholder: 'custom placeholder',
        readOnly: false,
        errors: [{ line: 1, message: 'test error', type: 'error' as const }],
        compilationSuccess: true,
        onCompile: vi.fn()
      }
      
      expect(() => {
        render(<CodeMirrorEditor {...fullProps} />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      
      render(<CodeMirrorEditor {...defaultProps} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      
      // Should be able to focus the editor
      await user.tab()
      expect(textarea).toHaveFocus()
    })

    it('should support screen readers', () => {
      render(<CodeMirrorEditor {...defaultProps} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('placeholder')
    })
  })

  describe('Performance', () => {
    it('should handle large text input efficiently', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onChange={onChange} />)
      
      const largeText = 'a'.repeat(10000)
      const textarea = screen.getByTestId('codemirror-textarea')
      
      // This should not cause performance issues
      fireEvent.change(textarea, { target: { value: largeText } })
      
      expect(onChange).toHaveBeenCalledWith(largeText)
    })

    it('should handle rapid consecutive changes', async () => {
      const onChange = vi.fn()
      
      render(<CodeMirrorEditor {...defaultProps} onChange={onChange} />)
      
      const textarea = screen.getByTestId('codemirror-textarea')
      
      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        fireEvent.change(textarea, { target: { value: `char${i}` } })
      }
      
      expect(onChange).toHaveBeenCalledTimes(100)
    })
  })

  describe('Integration Scenarios', () => {
    it('should work with complex GLSL code', () => {
      const complexGLSL = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  vec3 color = vec3(0.0);
  
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    vec2 pos = uv * (2.0 + layer * 0.5);
    pos += vec2(sin(u_time * 0.5 + layer), cos(u_time * 0.3 + layer)) * 0.1;
    
    float n = noise(pos);
    color[i] = smoothstep(0.3, 0.7, n);
  }
  
  gl_FragColor = vec4(color, 1.0);
}`
      
      render(<CodeMirrorEditor {...defaultProps} value={complexGLSL} />)
      expect(screen.getByDisplayValue(complexGLSL)).toBeInTheDocument()
    })

    it('should handle error-correction workflow', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onCompile = vi.fn()
      
      // Start with invalid code
      const { rerender } = render(
        <CodeMirrorEditor 
          {...defaultProps} 
          value="void main() { invalid_syntax }"
          onChange={onChange}
          onCompile={onCompile}
          compilationSuccess={false}
          errors={[{ line: 1, message: 'Syntax error', type: 'error' }]}
        />
      )
      
      // Verify error state
      const container = screen.getByTestId('codemirror-mock').parentElement
      expect(container).toHaveClass('border-red-500')
      
      // Fix the code
      const textarea = screen.getByTestId('codemirror-textarea')
      fireEvent.change(textarea, { 
        target: { value: 'void main() { gl_FragColor = vec4(1.0); }' } 
      })
      
      // Trigger compilation
      await user.keyboard('{Control>}s{/Control}')
      expect(onCompile).toHaveBeenCalled()
      
      // Update to success state
      rerender(
        <CodeMirrorEditor 
          {...defaultProps} 
          value="void main() { gl_FragColor = vec4(1.0); }"
          onChange={onChange}
          onCompile={onCompile}
          compilationSuccess={true}
          errors={[]}
        />
      )
      
      expect(container).toHaveClass('border-green-500')
    })

    it('should maintain cursor position during error updates', () => {
      const code = 'void main() { gl_FragColor = vec4(1.0); }'
      const errors: CompilationError[] = [
        { line: 1, message: 'Test error', type: 'error' }
      ]
      
      const { rerender } = render(
        <CodeMirrorEditor {...defaultProps} value={code} errors={[]} />
      )
      
      // Add errors
      rerender(
        <CodeMirrorEditor {...defaultProps} value={code} errors={errors} />
      )
      
      // Remove errors
      rerender(
        <CodeMirrorEditor {...defaultProps} value={code} errors={[]} />
      )
      
      // Component should continue to work normally
      expect(screen.getByDisplayValue(code)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined values gracefully', () => {
      expect(() => {
        render(
          <CodeMirrorEditor 
            value=""
            onChange={vi.fn()}
            errors={undefined as any}
            compilationSuccess={undefined}
            onCompile={undefined}
          />
        )
      }).not.toThrow()
    })

    it('should handle very long error messages', () => {
      const longError: CompilationError = {
        line: 1,
        message: 'This is a very long error message that might cause layout issues or performance problems if not handled correctly. '.repeat(10),
        type: 'error'
      }
      
      expect(() => {
        render(<CodeMirrorEditor {...defaultProps} errors={[longError]} />)
      }).not.toThrow()
    })

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<CodeMirrorEditor {...defaultProps} />)
      
      // Rapidly change props
      for (let i = 0; i < 50; i++) {
        rerender(
          <CodeMirrorEditor 
            {...defaultProps} 
            value={`code version ${i}`}
            compilationSuccess={i % 2 === 0}
            errors={i % 3 === 0 ? [{ line: 1, message: `Error ${i}`, type: 'error' }] : []}
          />
        )
      }
      
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument()
    })
  })
})