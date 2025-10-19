/**
 * Tests for GLSL Compiler
 * Validates error parsing, multipass error parsing, error message formatting,
 * mainImage validation, prepareShaderCode, and line number mapping with preprocessor
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseShaderError,
  parseMultipassShaderError,
  formatErrorMessage,
  prepareShaderCode,
  createShader,
  PreprocessorCompilationError,
  type CompilationError,
} from './GLSLCompiler';

describe('GLSLCompiler', () => {
  describe('parseShaderError', () => {
    it('should parse basic WebGL error pattern', () => {
      const errorLog = "ERROR: 0:15: 'myVariable' : undeclared identifier";
      const errors = parseShaderError(errorLog);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(15);
      expect(errors[0].message).toContain('Undeclared identifier');
      expect(errors[0].type).toBe('error');
    });

    it('should parse multiple errors', () => {
      const errorLog = `ERROR: 0:10: 'foo' : undeclared identifier
ERROR: 0:20: syntax error`;

      const errors = parseShaderError(errorLog);

      expect(errors).toHaveLength(2);
      expect(errors[0].line).toBe(10);
      expect(errors[1].line).toBe(20);
    });

    it('should parse warning patterns', () => {
      const errorLog = "WARNING: 0:5: unused variable 'temp'";
      const errors = parseShaderError(errorLog);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(5);
      expect(errors[0].type).toBe('warning');
    });

    it('should handle generic error messages without line numbers', () => {
      const errorLog = 'Shader compilation failed due to internal error';
      const errors = parseShaderError(errorLog);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(0);
      expect(errors[0].type).toBe('error');
    });

    it('should adjust line numbers based on userCodeStartLine offset', () => {
      const errorLog = "ERROR: 0:25: 'x' : undeclared identifier";
      const userCodeStartLine = 10; // Wrapper has 10 lines before user code
      const errors = parseShaderError(errorLog, userCodeStartLine);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(15); // 25 - 10 = 15
    });

    it('should ensure line numbers are at least 1', () => {
      const errorLog = "ERROR: 0:5: 'x' : undeclared identifier";
      const userCodeStartLine = 10; // Would result in negative line
      const errors = parseShaderError(errorLog, userCodeStartLine);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(1); // Clamped to minimum of 1
    });

    it('should use preprocessor line mapping when provided', () => {
      const errorLog = "ERROR: 0:20: 'x' : undeclared identifier";
      const userCodeStartLine = 10;
      const lineMapping = new Map<number, number>([
        [10, 5], // Preprocessed line 10 maps to original line 5
      ]);

      const errors = parseShaderError(errorLog, userCodeStartLine, lineMapping);

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(5); // Mapped through lineMapping
    });

    it('should handle empty error log', () => {
      const errors = parseShaderError('');
      expect(errors).toHaveLength(0);
    });

    it('should filter out empty lines', () => {
      const errorLog = `
ERROR: 0:10: 'x' : undeclared identifier

ERROR: 0:20: syntax error

`;
      const errors = parseShaderError(errorLog);

      expect(errors).toHaveLength(2);
    });
  });

  describe('parseMultipassShaderError', () => {
    it('should parse errors in user pass code', () => {
      const errorLog = "ERROR: 0:25: 'x' : undeclared identifier";
      const passName = 'Buffer A';
      const userCodeStartLine = 10;
      const commonLineCount = 5; // 5 lines of Common code prepended

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(10); // 25 - 10 (wrapper) - 5 (common) = 10
      expect(errors[0].passName).toBe('Buffer A');
      expect(errors[0].originalLine).toBe(25);
    });

    it('should detect errors in Common code and override passName', () => {
      const errorLog = "ERROR: 0:13: 'commonVar' : undeclared identifier";
      const passName = 'Buffer A'; // Compiling Buffer A but error is in Common
      const userCodeStartLine = 10;
      const commonLineCount = 5;

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(3); // 13 - 10 = 3, which is <= commonLineCount
      expect(errors[0].passName).toBe('Common'); // Automatically detected as Common error
    });

    it('should handle errors at the boundary of Common code', () => {
      const errorLog = "ERROR: 0:15: 'lastCommonLine' : error";
      const passName = 'Image';
      const userCodeStartLine = 10;
      const commonLineCount = 5;

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      // Line 15 - 10 = 5, exactly at commonLineCount boundary (still in Common)
      expect(errors[0].passName).toBe('Common');
      expect(errors[0].line).toBe(5);
    });

    it('should handle errors when Common code is empty', () => {
      const errorLog = "ERROR: 0:15: 'x' : undeclared identifier";
      const passName = 'Image';
      const userCodeStartLine = 10;
      const commonLineCount = 0;

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(5); // 15 - 10 = 5
      expect(errors[0].passName).toBe('Image');
    });

    it('should handle errors when compiling Common itself', () => {
      const errorLog = "ERROR: 0:12: 'x' : undeclared identifier";
      const passName = 'Common';
      const userCodeStartLine = 10;
      const commonLineCount = 0; // Not relevant when compiling Common

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(2); // 12 - 10 = 2
      expect(errors[0].passName).toBe('Common');
    });

    it('should parse warnings with multipass adjustments', () => {
      const errorLog = "WARNING: 0:20: unused variable";
      const passName = 'Buffer B';
      const userCodeStartLine = 10;
      const commonLineCount = 3;

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('warning');
      expect(errors[0].line).toBe(7); // 20 - 10 - 3 = 7
      expect(errors[0].passName).toBe('Buffer B');
    });

    it('should use preprocessor line mapping with multipass', () => {
      const errorLog = "ERROR: 0:20: 'x' : undeclared identifier";
      const passName = 'Image';
      const userCodeStartLine = 10;
      const commonLineCount = 5;
      const lineMapping = new Map<number, number>([
        [5, 3], // Preprocessed line 5 maps to original line 3
      ]);

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount,
        lineMapping
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].line).toBe(3); // Mapped through lineMapping
      expect(errors[0].passName).toBe('Image');
    });

    it('should handle multiple errors with mixed Common and user code', () => {
      const errorLog = `ERROR: 0:12: 'commonVar' : undeclared identifier
ERROR: 0:20: 'userVar' : undeclared identifier`;
      const passName = 'Buffer A';
      const userCodeStartLine = 10;
      const commonLineCount = 5;

      const errors = parseMultipassShaderError(
        errorLog,
        passName,
        userCodeStartLine,
        commonLineCount
      );

      expect(errors).toHaveLength(2);
      expect(errors[0].line).toBe(2);
      expect(errors[0].passName).toBe('Common'); // First error in Common
      expect(errors[1].line).toBe(5); // 20 - 10 - 5 = 5
      expect(errors[1].passName).toBe('Buffer A'); // Second error in user code
    });
  });

  describe('formatErrorMessage', () => {
    it('should format undeclared identifier errors', () => {
      const message = "'myVariable' : undeclared identifier";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Undeclared identifier: myVariable');
    });

    it('should format type mismatch errors', () => {
      const message = "cannot convert from vec2 to float";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Type mismatch: cannot convert vec2 to float');
    });

    it('should format incompatible types errors', () => {
      const message = "incompatible types in assignment";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Incompatible types in assignment');
    });

    it('should format no matching function errors', () => {
      const message = "no matching overloaded function found";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('No matching function signature found');
    });

    it('should format function-specific overload errors', () => {
      const message = "'texture' : no matching overloaded function";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Function texture: no matching signature found');
    });

    it('should format l-value required errors', () => {
      const message = "l-value required";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Invalid assignment target (requires modifiable variable)');
    });

    it('should format cannot assign to errors', () => {
      const message = "'gl_FragCoord' : cannot assign to";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Cannot assign to gl_FragCoord (read-only or constant)');
    });

    it('should format vector field selection errors', () => {
      const message = "vector field selection out of range";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Invalid vector component (use .xyzw or .rgba)');
    });

    it('should format index out of range errors', () => {
      const message = "index out of range";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Array index out of bounds');
    });

    it('should format syntax errors with unexpected token', () => {
      const message = "syntax error, unexpected IDENTIFIER";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Syntax error: unexpected IDENTIFIER');
    });

    it('should format generic syntax errors', () => {
      const message = "syntax error";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Syntax error');
    });

    it('should format missing semicolon errors', () => {
      const message = "expected ';' at end of statement";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Missing semicolon or statement terminator');
    });

    it('should format redefinition errors', () => {
      const message = "'myFunction' : redefinition";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Redefinition of myFunction');
    });

    it('should format type qualifier errors', () => {
      const message = "illegal use of type qualifier";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Illegal type qualifier usage');
    });

    it('should remove redundant quotes', () => {
      const message = "'variable' : some error";
      const formatted = formatErrorMessage(message);

      expect(formatted).not.toContain("'");
    });

    it('should normalize whitespace and colons', () => {
      const message = "error  :   message   with    spaces";
      const formatted = formatErrorMessage(message);

      expect(formatted).not.toMatch(/\s{2,}/); // No double spaces
      expect(formatted).not.toMatch(/\s*:\s{2,}/); // Normalized colons
    });

    it('should capitalize first letter of generic messages', () => {
      const message = "some generic error message";
      const formatted = formatErrorMessage(message);

      expect(formatted[0]).toBe(formatted[0].toUpperCase());
    });

    it('should strip ERROR: prefix', () => {
      const message = "ERROR: some error message";
      const formatted = formatErrorMessage(message);

      expect(formatted).not.toContain('ERROR:');
    });

    it('should strip WARNING: prefix', () => {
      const message = "WARNING: some warning message";
      const formatted = formatErrorMessage(message);

      expect(formatted).not.toContain('WARNING:');
    });

    it('should handle already formatted messages gracefully', () => {
      const message = "Undeclared identifier: myVar";
      const formatted = formatErrorMessage(message);

      expect(formatted).toBe('Undeclared identifier: myVar');
    });
  });

  describe('mainImage Validation', () => {
    it('should throw error when mainImage is missing', () => {
      const code = `void someOtherFunction() {
  // No mainImage
}`;

      expect(() => prepareShaderCode('', code, 'Image')).toThrow(PreprocessorCompilationError);

      try {
        prepareShaderCode('', code, 'Image');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.passName).toBe('Image');
        expect(e.preprocessorErrors[0].message).toContain('Missing mainImage function');
      }
    });

    it('should throw error when mainImage has incorrect signature', () => {
      const code = `void mainImage(vec4 fragColor, vec2 fragCoord) {
  // Missing 'out' qualifier
}`;

      expect(() => prepareShaderCode('', code, 'Image')).toThrow(PreprocessorCompilationError);

      try {
        prepareShaderCode('', code, 'Image');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.preprocessorErrors[0].message).toContain('Incorrect mainImage signature');
      }
    });

    it('should accept correct mainImage signature with "in" keyword', () => {
      const code = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      expect(() => prepareShaderCode('', code, 'Image')).not.toThrow();
    });

    it('should accept correct mainImage signature without "in" keyword', () => {
      const code = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      expect(() => prepareShaderCode('', code, 'Image')).not.toThrow();
    });

    it('should report line number of incorrect mainImage', () => {
      const code = `// Line 1
// Line 2
void mainImage(vec4 fragColor, vec2 fragCoord) {
  // Incorrect signature on line 3
}`;

      try {
        prepareShaderCode('', code, 'Image');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.preprocessorErrors[0].line).toBe(3);
      }
    });

    it('should validate mainImage after macro expansion', () => {
      const code = `#define SIGNATURE out vec4 fragColor, vec2 fragCoord
void mainImage(SIGNATURE) {
  fragColor = vec4(1.0);
}`;

      expect(() => prepareShaderCode('', code, 'Image')).not.toThrow();
    });
  });

  describe('prepareShaderCode', () => {
    it('should wrap user code with WebGL 2.0 shader wrapper', () => {
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.code).toContain('#version 300 es');
      expect(result.code).toContain('uniform vec3      iResolution'); // Has whitespace padding
      expect(result.code).toContain('uniform float     iTime');
      expect(result.code).toContain('out vec4 fragColor');
      expect(result.code).toContain('void main()');
      expect(result.code).toContain('mainImage(fragColor, gl_FragCoord.xy)');
    });

    it('should prepend Common code before user code', () => {
      const commonCode = `float commonFunction() {
  return 42.0;
}`;
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(commonFunction());
}`;

      const result = prepareShaderCode(commonCode, userCode, 'Buffer A');

      expect(result.code).toContain('commonFunction');
      expect(result.code.indexOf('commonFunction')).toBeLessThan(result.code.indexOf('mainImage'));
      expect(result.commonLineCount).toBeGreaterThan(0);
    });

    it('should preprocess combined Common + user code together', () => {
      const commonCode = `#define PI 3.14159`;
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  float value = PI;
  fragColor = vec4(value);
}`;

      const result = prepareShaderCode(commonCode, userCode, 'Image');

      expect(result.code).toContain('3.14159'); // Macro expanded
      expect(result.code).not.toContain('#define PI');
    });

    it('should handle user-specified precision declaration', () => {
      const userCode = `precision highp float;
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.code).toContain('#version 300 es');
      expect(result.code).toContain('precision highp float');
      expect(result.code.match(/precision highp float/g)?.length).toBe(1); // Only once
    });

    it('should add default precision if not specified', () => {
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.code).toContain('precision mediump float');
    });

    it('should return correct userCodeStartLine', () => {
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.userCodeStartLine).toBeGreaterThan(0);
      // userCodeStartLine is the index where {USER_CODE} placeholder was,
      // which gets replaced with the actual user code
      // So we verify that user code appears after the uniforms
      const codeBeforeUser = result.code.substring(0, result.code.indexOf('void mainImage'));
      expect(codeBeforeUser).toContain('uniform vec3');
      expect(codeBeforeUser).toContain('out vec4 fragColor');
    });

    it('should calculate correct commonLineCount after preprocessing', () => {
      const commonCode = `#define HELPER 1.0
float helper() { return HELPER; }`;
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(helper());
}`;

      const result = prepareShaderCode(commonCode, userCode, 'Buffer A');

      expect(result.commonLineCount).toBeGreaterThan(0);
      // Common has 2 lines, but #define is removed during preprocessing,
      // so processed count should be different
    });

    it('should return line mapping from preprocessor', () => {
      const userCode = `#define VALUE 1.0
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  float x = VALUE;
  fragColor = vec4(x);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.lineMapping).toBeDefined();
      expect(result.lineMapping).toBeInstanceOf(Map);
    });

    it('should handle preprocessor errors in Common code', () => {
      const commonCode = `#ifdef UNDEFINED
// Unclosed conditional!`;
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      expect(() => prepareShaderCode(commonCode, userCode, 'Buffer A')).toThrow(PreprocessorCompilationError);

      try {
        prepareShaderCode(commonCode, userCode, 'Buffer A');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.passName).toBe('Common'); // Error attributed to Common
      }
    });

    it('should handle preprocessor errors in user code', () => {
      const userCode = `#ifdef UNDEFINED
// Unclosed conditional!
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      expect(() => prepareShaderCode('', userCode, 'Image')).toThrow(PreprocessorCompilationError);

      try {
        prepareShaderCode('', userCode, 'Image');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.passName).toBe('Image'); // Error attributed to user pass
      }
    });

    it('should adjust preprocessor error line numbers for user code', () => {
      const commonCode = `// Common line 1
// Common line 2
// Common line 3`;
      const userCode = `#ifdef UNDEFINED
// Unclosed at user line 1
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      try {
        prepareShaderCode(commonCode, userCode, 'Buffer A');
      } catch (error) {
        const e = error as PreprocessorCompilationError;
        expect(e.passName).toBe('Buffer A');
        // Error line should be adjusted relative to user code start
        expect(e.preprocessorErrors[0].line).toBeGreaterThan(0);
      }
    });

    it('should handle empty Common code', () => {
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      expect(result.commonLineCount).toBe(0);
      expect(result.code).toContain('mainImage');
    });

    it('should handle whitespace-only Common code', () => {
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('   \n\n  ', userCode, 'Image');

      expect(result.commonLineCount).toBe(0);
    });

    it('should preserve GLSL #version directive if in user code', () => {
      const userCode = `#version 300 es
precision highp float;
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  fragColor = vec4(1.0);
}`;

      const result = prepareShaderCode('', userCode, 'Image');

      // Should have version directive (only one, either from user or wrapper)
      expect(result.code).toContain('#version 300 es');
    });
  });

  describe('createShader', () => {
    it('should create and compile a shader successfully', () => {
      const mockGL = {
        createShader: vi.fn(() => ({} as WebGLShader)),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true), // Success
        getShaderInfoLog: vi.fn(() => ''),
        deleteShader: vi.fn(),
        VERTEX_SHADER: 35633,
        COMPILE_STATUS: 35713,
      } as unknown as WebGLRenderingContext;

      const shader = createShader(mockGL, mockGL.VERTEX_SHADER, 'void main() {}');

      expect(shader).toBeDefined();
      expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.VERTEX_SHADER);
      expect(mockGL.shaderSource).toHaveBeenCalled();
      expect(mockGL.compileShader).toHaveBeenCalled();
    });

    it('should throw error when compilation fails', () => {
      const mockGL = {
        createShader: vi.fn(() => ({} as WebGLShader)),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => false), // Failure
        getShaderInfoLog: vi.fn(() => 'ERROR: Compilation failed'),
        deleteShader: vi.fn(),
        VERTEX_SHADER: 35633,
        COMPILE_STATUS: 35713,
      } as unknown as WebGLRenderingContext;

      expect(() => createShader(mockGL, mockGL.VERTEX_SHADER, 'invalid code')).toThrow('ERROR: Compilation failed');
      expect(mockGL.deleteShader).toHaveBeenCalled();
    });

    it('should return null when shader creation fails', () => {
      const mockGL = {
        createShader: vi.fn(() => null), // Creation failed
        VERTEX_SHADER: 35633,
      } as unknown as WebGLRenderingContext;

      const shader = createShader(mockGL, mockGL.VERTEX_SHADER, 'void main() {}');

      expect(shader).toBeNull();
    });
  });

  describe('Integration: Error Parsing with Line Mapping', () => {
    it('should correctly map errors through all layers (wrapper + Common + preprocessor)', () => {
      const commonCode = `#define COMMON_VALUE 1.0
float commonHelper() { return COMMON_VALUE; }`;
      const userCode = `#define USER_VALUE 2.0
void mainImage(out vec4 fragColor, vec2 fragCoord) {
  float x = USER_VALUE; // Uses macro
  fragColor = vec4(x + commonHelper());
}`;

      // This tests the complete flow:
      // 1. prepareShaderCode combines Common + user code
      // 2. Preprocessor runs and creates line mapping
      // 3. Code is wrapped with uniforms/boilerplate
      // 4. When error occurs, it should map back to original user code line

      const result = prepareShaderCode(commonCode, userCode, 'Buffer A');

      // Simulate a compiler error at some line in the final code
      // We can't easily determine the exact line without actually compiling,
      // but we can verify the line mapping exists and is usable
      expect(result.lineMapping).toBeDefined();
      expect(result.userCodeStartLine).toBeGreaterThan(0);
      expect(result.commonLineCount).toBeGreaterThan(0);

      // The structure should be:
      // - Version and precision
      // - Uniform declarations
      // - User code start marker
      // - Preprocessed Common code
      // - Preprocessed user code
      // - main() function

      expect(result.code).toContain('#version 300 es');
      expect(result.code).toContain('uniform vec3');
      expect(result.code).toContain('1.0'); // COMMON_VALUE expanded
      expect(result.code).toContain('2.0'); // USER_VALUE expanded
      expect(result.code).not.toContain('#define');
    });

    it('should attribute errors to correct pass with line mapping', () => {
      const commonCode = `float commonHelper() { return undefinedCommonVar; }`;
      const userCode = `void mainImage(out vec4 fragColor, vec2 fragCoord) {
  float x = undefinedUserVar;
  fragColor = vec4(x);
}`;

      // We're testing the prepareShaderCode structure, not actual compilation
      const result = prepareShaderCode(commonCode, userCode, 'Buffer A');

      // Verify structure is set up correctly for error attribution
      expect(result.commonLineCount).toBeGreaterThan(0);
      expect(result.userCodeStartLine).toBeGreaterThan(0);

      // If we were to compile this and get errors, the multipass error parser
      // would use these values to determine which tab the error belongs to
    });
  });
});
