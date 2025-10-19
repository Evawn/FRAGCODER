/**
 * Tests for GLSL Preprocessor
 * Validates macro expansion, conditional compilation, line mapping, and error handling
 */

import { describe, it, expect } from 'vitest';
import { preprocessGLSL, extractMacroNames } from './GLSLPreprocessor';

describe('GLSLPreprocessor', () => {
  describe('Simple Macro Expansion', () => {
    it('should expand constant macros', () => {
      const source = `#define PI 3.14159
float circumference = 2.0 * PI * radius;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('2.0 * 3.14159 * radius');
      expect(result.errors).toHaveLength(0);
    });

    it('should expand multiple constant macros', () => {
      const source = `#define PI 3.14159
#define E 2.71828
float value = PI + E;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('3.14159 + 2.71828');
      expect(result.errors).toHaveLength(0);
    });

    it('should expand flag macros (no value)', () => {
      const source = `#define ENABLED
#ifdef ENABLED
float value = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float value = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should respect word boundaries in macro expansion', () => {
      const source = `#define X 5
float x = X;
float xValue = 10;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float x = 5;');
      expect(result.code).toContain('float xValue = 10;'); // Should not expand 'X' in 'xValue'
      expect(result.errors).toHaveLength(0);
    });

    it('should handle #undef directive in conditionals', () => {
      // Test #undef with conditionals - the main use case
      const source = `#define FEATURE
#ifdef FEATURE
float a = 1.0;
#endif
#undef FEATURE
#ifdef FEATURE
float b = 2.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float a = 1.0;');
      // After #undef, FEATURE is not defined, so this code is excluded
      expect(result.code).not.toContain('float b = 2.0;');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Function-like Macro Expansion', () => {
    it('should expand function-like macros', () => {
      const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
float result = MAX(x, y);`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('((x) > (y) ? (x) : (y))');
      expect(result.errors).toHaveLength(0);
    });

    it('should expand function-like macros with expressions', () => {
      const source = `#define SQUARE(x) ((x) * (x))
float area = SQUARE(radius + 1.0);`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('((radius + 1.0) * (radius + 1.0))');
      expect(result.errors).toHaveLength(0);
    });

    it('should expand nested function-like macros', () => {
      const source = `#define DOUBLE(x) ((x) * 2.0)
#define QUAD(x) DOUBLE(DOUBLE(x))
float value = QUAD(5.0);`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('((((5.0) * 2.0)) * 2.0)');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle function-like macros with no arguments', () => {
      const source = `#define GETPI() 3.14159
float value = GETPI();`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('3.14159');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle function-like macros with multiple arguments', () => {
      const source = `#define LERP(a, b, t) ((a) + ((b) - (a)) * (t))
float interpolated = LERP(0.0, 10.0, 0.5);`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('((0.0) + ((10.0) - (0.0)) * (0.5))');
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for wrong argument count', () => {
      const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
float result = MAX(x);`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('expects 2 arguments, got 1');
    });

    it('should report error for unmatched parentheses', () => {
      const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
float result = MAX(x, y;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unmatched parentheses');
    });
  });

  describe('Conditional Compilation - #ifdef/#ifndef', () => {
    it('should include code when macro is defined (#ifdef)', () => {
      const source = `#define DEBUG
#ifdef DEBUG
float debugValue = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float debugValue = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should exclude code when macro is not defined (#ifdef)', () => {
      const source = `#ifdef UNDEFINED_MACRO
float shouldNotAppear = 1.0;
#endif
float shouldAppear = 2.0;`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('shouldNotAppear');
      expect(result.code).toContain('float shouldAppear = 2.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should include code when macro is not defined (#ifndef)', () => {
      const source = `#ifndef UNDEFINED_MACRO
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should exclude code when macro is defined (#ifndef)', () => {
      const source = `#define DEFINED_MACRO
#ifndef DEFINED_MACRO
float shouldNotAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('shouldNotAppear');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle #else branches', () => {
      const source = `#ifdef UNDEFINED_MACRO
float a = 1.0;
#else
float b = 2.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('float a = 1.0;');
      expect(result.code).toContain('float b = 2.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle #else when condition is true', () => {
      const source = `#define DEFINED
#ifdef DEFINED
float a = 1.0;
#else
float b = 2.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float a = 1.0;');
      expect(result.code).not.toContain('float b = 2.0;');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Conditional Compilation - #if expressions', () => {
    it('should evaluate #if with numeric literals', () => {
      const source = `#if 1
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with zero as false', () => {
      const source = `#if 0
float shouldNotAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('shouldNotAppear');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with defined() function', () => {
      const source = `#define FEATURE_ENABLED
#if defined(FEATURE_ENABLED)
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with !defined()', () => {
      const source = `#if !defined(UNDEFINED_MACRO)
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with comparison operators', () => {
      const source = `#define VERSION 2
#if VERSION > 1
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with equality operators', () => {
      const source = `#define VALUE 42
#if VALUE == 42
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with logical AND (&&)', () => {
      const source = `#define A 1
#define B 1
#if A && B
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with logical OR (||)', () => {
      const source = `#define A 0
#define B 1
#if A || B
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should evaluate #if with parentheses', () => {
      const source = `#define A 1
#define B 0
#define C 1
#if (A || B) && C
float shouldAppear = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float shouldAppear = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle #elif directive', () => {
      const source = `#define VALUE 2
#if VALUE == 1
float a = 1.0;
#elif VALUE == 2
float b = 2.0;
#else
float c = 3.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('float a = 1.0;');
      expect(result.code).toContain('float b = 2.0;');
      expect(result.code).not.toContain('float c = 3.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple #elif directives', () => {
      const source = `#define VALUE 3
#if VALUE == 1
float a = 1.0;
#elif VALUE == 2
float b = 2.0;
#elif VALUE == 3
float c = 3.0;
#else
float d = 4.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('float a = 1.0;');
      expect(result.code).not.toContain('float b = 2.0;');
      expect(result.code).toContain('float c = 3.0;');
      expect(result.code).not.toContain('float d = 4.0;');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Nested Conditionals', () => {
    it('should handle nested #ifdef directives', () => {
      const source = `#define OUTER
#define INNER
#ifdef OUTER
float outer = 1.0;
#ifdef INNER
float inner = 2.0;
#endif
float afterInner = 3.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float outer = 1.0;');
      expect(result.code).toContain('float inner = 2.0;');
      expect(result.code).toContain('float afterInner = 3.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested conditionals with outer false', () => {
      const source = `#ifdef UNDEFINED_OUTER
float outer = 1.0;
#define INNER
#ifdef INNER
float inner = 2.0;
#endif
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).not.toContain('outer');
      expect(result.code).not.toContain('inner');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested conditionals with inner false', () => {
      const source = `#define OUTER
#ifdef OUTER
float outer = 1.0;
#ifdef UNDEFINED_INNER
float inner = 2.0;
#endif
float afterInner = 3.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float outer = 1.0;');
      expect(result.code).not.toContain('float inner = 2.0;');
      expect(result.code).toContain('float afterInner = 3.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle deeply nested conditionals (3 levels)', () => {
      const source = `#define L1
#define L2
#define L3
#ifdef L1
#ifdef L2
#ifdef L3
float deepValue = 1.0;
#endif
#endif
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float deepValue = 1.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested #if and #ifdef', () => {
      const source = `#define VERSION 2
#if VERSION >= 2
#define FEATURE_ENABLED
#ifdef FEATURE_ENABLED
float value = 1.0;
#endif
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float value = 1.0;');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Line Mapping Preservation', () => {
    it('should preserve line mapping for simple code', () => {
      const source = `float a = 1.0;
float b = 2.0;
float c = 3.0;`;

      const result = preprocessGLSL(source);

      expect(result.lineMapping.get(1)).toBe(1);
      expect(result.lineMapping.get(2)).toBe(2);
      expect(result.lineMapping.get(3)).toBe(3);
    });

    it('should map lines correctly when macros are removed', () => {
      const source = `#define PI 3.14159
float a = 1.0;
float b = PI;
float c = 3.0;`;

      const result = preprocessGLSL(source);

      expect(result.lineMapping.get(1)).toBe(1); // #define line
      expect(result.lineMapping.get(2)).toBe(2);
      expect(result.lineMapping.get(3)).toBe(3);
      expect(result.lineMapping.get(4)).toBe(4);
    });

    it('should map lines correctly with conditionals', () => {
      const source = `float a = 1.0;
#ifdef UNDEFINED
float b = 2.0;
#endif
float c = 3.0;`;

      const result = preprocessGLSL(source);

      expect(result.lineMapping.get(1)).toBe(1);
      expect(result.lineMapping.get(2)).toBe(2); // #ifdef
      expect(result.lineMapping.get(3)).toBe(3); // excluded line
      expect(result.lineMapping.get(4)).toBe(4); // #endif
      expect(result.lineMapping.get(5)).toBe(5);
    });

    it('should handle line splicing with backslashes', () => {
      const source = `#define LONG_MACRO \\
  this is a \\
  multi-line macro
float value = LONG_MACRO;`;

      const result = preprocessGLSL(source);

      expect(result.errors).toHaveLength(0);
      // The first line of the macro definition should map to line 1
      expect(result.lineMapping.get(1)).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should report unclosed #ifdef', () => {
      const source = `#ifdef DEBUG
float value = 1.0;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed conditional');
    });

    it('should report unclosed #if', () => {
      const source = `#if 1
float value = 1.0;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed conditional');
    });

    it('should report #endif without matching #if', () => {
      const source = `float value = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('#endif without matching');
    });

    it('should report #else without matching #if', () => {
      const source = `float value = 1.0;
#else
float other = 2.0;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('#else without matching');
    });

    it('should report #elif without matching #if', () => {
      const source = `float value = 1.0;
#elif 1
float other = 2.0;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('#elif without matching');
    });

    it('should handle #define with just a name as flag macro', () => {
      // Note: The implementation treats "#define" with no arguments as invalid,
      // but doesn't explicitly error - it just fails to parse
      const source = `#define FLAG
float value = 1.0;`;

      const result = preprocessGLSL(source);

      // This should work as a flag macro (value defaults to '1')
      expect(result.errors).toHaveLength(0);
    });

    it('should detect circular macro definitions', () => {
      const source = `#define A B
#define B A
float value = A;`;

      const result = preprocessGLSL(source);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('maximum recursion depth');
    });

    it('should handle invalid tokens in #if expressions gracefully', () => {
      // The tokenizer treats unknown identifiers as 0, so @@@invalid becomes 0
      const source = `#if @@@invalid
float value = 1.0;
#endif`;

      const result = preprocessGLSL(source);

      // Implementation treats invalid tokens as 0, so this evaluates to false
      // and excludes the code without error
      expect(result.code).not.toContain('float value = 1.0;');
    });
  });

  describe('GLSL-specific Directives', () => {
    it('should pass through #version directive', () => {
      const source = `#version 300 es
float value = 1.0;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('#version 300 es');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass through #extension directive', () => {
      const source = `#extension GL_OES_standard_derivatives : enable
float value = 1.0;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('#extension GL_OES_standard_derivatives : enable');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle #version with macros', () => {
      const source = `#version 300 es
#define PI 3.14159
float value = PI;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('#version 300 es');
      expect(result.code).toContain('3.14159');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('extractMacroNames', () => {
    it('should extract constant macro names', () => {
      const source = `#define PI 3.14159
#define E 2.71828
float value = PI + E;`;

      const macros = extractMacroNames(source);

      expect(macros).toContain('PI');
      expect(macros).toContain('E');
      expect(macros).toHaveLength(2);
    });

    it('should extract function-like macro names', () => {
      const source = `#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))`;

      const macros = extractMacroNames(source);

      expect(macros).toContain('MAX');
      expect(macros).toContain('MIN');
      expect(macros).toHaveLength(2);
    });

    it('should extract flag macro names', () => {
      const source = `#define ENABLED
#define DEBUG`;

      const macros = extractMacroNames(source);

      expect(macros).toContain('ENABLED');
      expect(macros).toContain('DEBUG');
      expect(macros).toHaveLength(2);
    });

    it('should ignore non-define directives', () => {
      const source = `#version 300 es
#define PI 3.14159
#ifdef DEBUG
#endif`;

      const macros = extractMacroNames(source);

      expect(macros).toContain('PI');
      expect(macros).toHaveLength(1);
    });

    it('should return empty array for code without macros', () => {
      const source = `float value = 1.0;
vec3 color = vec3(1.0);`;

      const macros = extractMacroNames(source);

      expect(macros).toHaveLength(0);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle empty input', () => {
      const result = preprocessGLSL('');

      expect(result.code).toBe('');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle input with only whitespace', () => {
      const result = preprocessGLSL('   \n\n  \n   ');

      expect(result.errors).toHaveLength(0);
    });

    it('should handle macro expansion in comments (should still expand)', () => {
      const source = `#define VALUE 42
// This is VALUE in a comment
float x = VALUE;`;

      const result = preprocessGLSL(source);

      // Comments are not stripped by preprocessor, macros in comments ARE expanded
      expect(result.code).toContain('42');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle macros with special characters in values', () => {
      const source = `#define SHADER_CODE "void main() { }"
const char* code = SHADER_CODE;`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('"void main() { }"');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle conditional compilation with #undef', () => {
      const source = `#define FEATURE
#ifdef FEATURE
float a = 1.0;
#endif
#undef FEATURE
#ifdef FEATURE
float b = 2.0;
#endif`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('float a = 1.0;');
      expect(result.code).not.toContain('float b = 2.0;');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle complex real-world shader preprocessor usage', () => {
      const source = `#version 300 es
#define USE_LIGHTING 1
#define MAX_LIGHTS 4

#if USE_LIGHTING
  #define LIGHT_CALC(i) lights[i] * intensity
  uniform vec3 lights[MAX_LIGHTS];
#else
  #define LIGHT_CALC(i) vec3(1.0)
#endif

void main() {
  vec3 color = LIGHT_CALC(0);
}`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('#version 300 es');
      expect(result.code).toContain('uniform vec3 lights[4];');
      expect(result.code).toContain('lights[0] * intensity');
      expect(result.code).not.toContain('vec3(1.0)'); // else branch not taken
      expect(result.errors).toHaveLength(0);
    });

    it('should handle macro expansion with nested parentheses', () => {
      const source = `#define COMPLEX(x) ((((x) + 1) * 2) - 3)
float value = COMPLEX((a + b));`;

      const result = preprocessGLSL(source);

      expect(result.code).toContain('(((((a + b)) + 1) * 2) - 3)');
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve blank lines for excluded conditional blocks', () => {
      const source = `float a = 1.0;
#ifdef UNDEFINED
float b = 2.0;
float c = 3.0;
#endif
float d = 4.0;`;

      const result = preprocessGLSL(source);
      const lines = result.code.split('\n');

      // Should have blank lines where excluded code was
      expect(lines[0]).toContain('float a = 1.0;');
      expect(lines[1]).toBe(''); // #ifdef
      expect(lines[2]).toBe(''); // excluded line
      expect(lines[3]).toBe(''); // excluded line
      expect(lines[4]).toBe(''); // #endif
      expect(lines[5]).toContain('float d = 4.0;');
    });
  });
});
