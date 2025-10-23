/**
 * GLSL shader compiler with multipass support, preprocessing, error tracking, and line mapping.
 * Handles Shadertoy-style shaders with Common code sharing, buffer passes, and mainImage validation.
 */
export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
  passName?: string;  // Which pass this error belongs to (Image, Buffer A-D, Common)
  originalLine?: number;  // Original line number before adjustments
  preprocessedLine?: number;  // Line number after preprocessing
}

export interface CompileResult {
  success: boolean;
  code: string;
  errors: CompilationError[];
  compiledShader?: WebGLShader;
}

export interface TabShaderData {
  id: string;
  name: string;
  code: string;
}

export interface PassErrorInfo {
  passName: string;
  errorMessage: string;
  userCodeStartLine: number;
  commonLineCount: number;
  lineMapping?: Map<number, number>;
}

export interface MultipassCompilationError extends Error {
  passErrors: PassErrorInfo[];
}

export class PreprocessorCompilationError extends Error {
  passName: string;
  preprocessorErrors: Array<{ line: number; message: string }>;

  constructor(
    passName: string,
    preprocessorErrors: Array<{ line: number; message: string }>,
    message?: string
  ) {
    super(message || `Preprocessor errors in ${passName}`);
    this.name = 'PreprocessorCompilationError';
    this.passName = passName;
    this.preprocessorErrors = preprocessorErrors;
  }
}

import { preprocessGLSL } from './GLSLPreprocessor';

// Minimal vertex shader for WebGL 2.0
export const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// WebGL 2.0 fragment shader wrapper with GLSL ES 3.00 syntax
export const FRAGMENT_SHADER_WRAPPER = `{VERSION_AND_PRECISION}

uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform float     iFrameRate;            // shader frame rate
uniform int       iFrame;                // shader playback frame
uniform vec4      iDate;                 // (year, month, day, time in seconds)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D BufferA;               // Buffer A texture
uniform sampler2D BufferB;               // Buffer B texture
uniform sampler2D BufferC;               // Buffer C texture
uniform sampler2D BufferD;               // Buffer D texture

out vec4 fragColor;                      // WebGL 2.0 output

// User shader code starts here
{USER_CODE}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
`;

/**
 * Creates and compiles a WebGL shader
 */
export function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const error = gl.getShaderInfoLog(shader) || 'Unknown error';
    gl.deleteShader(shader);
    throw new Error(error);
  }

  return shader;
}

/**
 * Calculates the correct user-facing line number from compiler line number
 * Now supports preprocessor line mapping
 */
function calculateLineNumber(compilerLine: number, userCodeStartLine: number, lineMapping?: Map<number, number>): number {
  let adjustedLine: number;

  if (userCodeStartLine < 0) {
    // Negative indicates uniforms inserted after precision
    const uniformLines = 10;
    if (compilerLine <= Math.abs(userCodeStartLine)) {
      adjustedLine = compilerLine;
    } else {
      adjustedLine = compilerLine - uniformLines;
    }
  } else {
    // Normal case: subtract wrapper offset
    adjustedLine = compilerLine - userCodeStartLine;
  }

  // If we have preprocessor line mapping, map back to original source line
  if (lineMapping && lineMapping.has(adjustedLine)) {
    return lineMapping.get(adjustedLine)!;
  }

  return adjustedLine;
}

/**
 * Parses WebGL shader compilation errors and converts them to user-friendly format
 */
export function parseShaderError(error: string, userCodeStartLine: number = 0, lineMapping?: Map<number, number>): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = error.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // Match WebGL error format: "ERROR: 0:15: 'variable' : undeclared identifier"
    // Captures: file(1), line(2), message(3)
    const errorMatch = line.match(/ERROR:\s*(\d+):(\d+):\s*(.+)/i);
    if (errorMatch) {
      const compilerLine = parseInt(errorMatch[2], 10);
      const rawMessage = errorMatch[3].trim();

      errors.push({
        line: Math.max(1, calculateLineNumber(compilerLine, userCodeStartLine, lineMapping)),
        message: formatErrorMessage(rawMessage),
        type: 'error'
      });
      continue;
    }

    // Match WebGL warning format: "WARNING: 0:15: ..."
    // Captures: file(1), line(2), message(3)
    const warningMatch = line.match(/WARNING:\s*(\d+):(\d+):\s*(.+)/i);
    if (warningMatch) {
      const compilerLine = parseInt(warningMatch[2], 10);
      const rawMessage = warningMatch[3].trim();

      errors.push({
        line: Math.max(1, calculateLineNumber(compilerLine, userCodeStartLine, lineMapping)),
        message: formatErrorMessage(rawMessage),
        type: 'warning'
      });
      continue;
    }

    // Generic error/failure messages without line numbers
    if (/error|failed/i.test(line)) {
      errors.push({
        line: 0,
        message: formatErrorMessage(line),
        type: 'error'
      });
    }
  }

  return errors;
}

/**
 * Calculates the adjusted line number for multipass shaders with Common code prepending
 * Now supports preprocessor line mapping
 *
 * When Common code is prepended to a pass (e.g., Buffer A), errors from the compiler
 * need to be attributed to either the Common tab or the pass tab based on line position.
 * Returns: { line: adjusted line number, isInCommon: whether error is in Common code }
 */
function calculateMultipassLineNumber(
  compilerLine: number,
  userCodeStartLine: number,
  commonLineCount: number,
  passName: string,
  lineMapping?: Map<number, number>
): { line: number; isInCommon: boolean } {
  // First, adjust for wrapper code
  let adjustedLine = compilerLine - userCodeStartLine;

  // Determine if error is in Common code section
  // If adjustedLine <= commonLineCount, the error is in the prepended Common code
  const isInCommon = passName !== 'Common' && commonLineCount > 0 && adjustedLine <= commonLineCount;

  // If error is NOT in Common (it's in the user pass code), subtract Common lines
  if (!isInCommon && passName !== 'Common' && commonLineCount > 0) {
    // Account for Common code + blank line separator
    adjustedLine -= commonLineCount;
  }

  // If we have preprocessor line mapping, map back to original source line
  if (lineMapping && lineMapping.has(adjustedLine)) {
    return { line: lineMapping.get(adjustedLine)!, isInCommon };
  }

  return { line: adjustedLine, isInCommon };
}

/**
 * Parses WebGL shader compilation errors for multipass shaders
 * Adjusts line numbers based on Common code prepending and tags errors with pass name
 * Automatically detects and corrects passName when error is in Common code
 */
export function parseMultipassShaderError(
  error: string,
  passName: string,
  userCodeStartLine: number,
  commonLineCount: number,
  lineMapping?: Map<number, number>
): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = error.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // WebGL error pattern: "ERROR: 0:15: ..."
    const errorMatch = line.match(/ERROR:\s*(\d+):(\d+):\s*(.+)/i);
    if (errorMatch) {
      const compilerLine = parseInt(errorMatch[2], 10);
      const rawMessage = errorMatch[3].trim();

      const { line: adjustedLine, isInCommon } = calculateMultipassLineNumber(
        compilerLine,
        userCodeStartLine,
        commonLineCount,
        passName,
        lineMapping
      );

      errors.push({
        line: Math.max(1, adjustedLine),
        originalLine: compilerLine,
        message: formatErrorMessage(rawMessage),
        type: 'error',
        passName: isInCommon ? 'Common' : passName  // Override passName if error is in Common
      });
      continue;
    }

    // Match WebGL warning format: "WARNING: 0:15: ..."
    // Captures: file(1), line(2), message(3) - same as error format
    const warningMatch = line.match(/WARNING:\s*(\d+):(\d+):\s*(.+)/i);
    if (warningMatch) {
      const compilerLine = parseInt(warningMatch[2], 10);
      const rawMessage = warningMatch[3].trim();

      const { line: adjustedLine, isInCommon } = calculateMultipassLineNumber(
        compilerLine,
        userCodeStartLine,
        commonLineCount,
        passName,
        lineMapping
      );

      errors.push({
        line: Math.max(1, adjustedLine),
        originalLine: compilerLine,
        message: formatErrorMessage(rawMessage),
        type: 'warning',
        passName: isInCommon ? 'Common' : passName  // Override passName if error is in Common
      });
      continue;
    }

    // Generic error/failure messages without line numbers
    if (/error|failed/i.test(line)) {
      errors.push({
        line: 0,
        message: formatErrorMessage(line),
        type: 'error',
        passName
      });
    }
  }

  return errors;
}

/**
 * Formats error messages to be more user-friendly, concise, and professional
 * Converts verbose WebGL compiler errors into readable diagnostic messages
 */
export function formatErrorMessage(message: string): string {
  // Normalize the message
  let normalized = message.trim();

  // Remove redundant quotes around identifiers (e.g., 'foo' -> foo)
  normalized = normalized.replace(/['"`]([^'"`]+)['"`]/g, '$1');

  // Remove excessive colons and whitespace
  normalized = normalized.replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ');

  // Error pattern mappings - transforms common WebGL errors into user-friendly messages
  // Each pattern matches a specific error type and provides a clearer explanation
  const patterns: Array<{ regex: RegExp; format: (match: RegExpMatchArray) => string }> = [
    // Undeclared identifier (variable or function not defined)
    {
      regex: /(.+?):\s*undeclared identifier/i,
      format: (m) => `Undeclared identifier: ${m[1]}`
    },
    // Type mismatches
    {
      regex: /cannot convert from\s+(.+?)\s+to\s+(.+)/i,
      format: (m) => `Type mismatch: cannot convert ${m[1]} to ${m[2]}`
    },
    {
      regex: /incompatible types in (.+)/i,
      format: (m) => `Incompatible types in ${m[1]}`
    },
    // Function errors
    {
      regex: /no matching overloaded function found/i,
      format: () => `No matching function signature found`
    },
    {
      regex: /(.+?):\s*no matching overloaded function/i,
      format: (m) => `Function ${m[1]}: no matching signature found`
    },
    // Assignment errors
    {
      regex: /l-value required/i,
      format: () => `Invalid assignment target (requires modifiable variable)`
    },
    {
      regex: /(.+?):\s*cannot assign to/i,
      format: (m) => `Cannot assign to ${m[1]} (read-only or constant)`
    },
    // Vector/array errors
    {
      regex: /vector field selection out of range/i,
      format: () => `Invalid vector component (use .xyzw or .rgba)`
    },
    {
      regex: /index out of range/i,
      format: () => `Array index out of bounds`
    },
    // Syntax errors
    {
      regex: /syntax error,?\s*unexpected\s+(.+)/i,
      format: (m) => `Syntax error: unexpected ${m[1]}`
    },
    {
      regex: /syntax error/i,
      format: () => `Syntax error`
    },
    // Missing semicolons
    {
      regex: /expected.*?[';']/i,
      format: () => `Missing semicolon or statement terminator`
    },
    // Redefinition errors
    {
      regex: /(.+?):\s*redefinition/i,
      format: (m) => `Redefinition of ${m[1]}`
    },
    // Type qualifier errors
    {
      regex: /illegal use of type qualifier/i,
      format: () => `Illegal type qualifier usage`
    }
  ];

  // Try to match and format using patterns
  for (const { regex, format } of patterns) {
    const match = normalized.match(regex);
    if (match) {
      return format(match);
    }
  }

  // Clean up common verbose patterns if no specific match
  normalized = normalized
    .replace(/^ERROR:\s*/i, '')
    .replace(/^WARNING:\s*/i, '')
    .replace(/^0:\d+:\s*/, '');

  // Capitalize first letter for consistency
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return normalized;
}

/**
 * Validates that the shader code contains a properly-formed mainImage function
 * All FRAGCODER shaders must define: void mainImage(out vec4 fragColor, vec2 fragCoord)
 * @throws PreprocessorCompilationError if mainImage is missing or has incorrect signature
 */
function validateMainImageSignature(code: string, passName: string): void {
  // Check if mainImage function exists (basic check, refined below)
  const mainImageRegex = /void\s+mainImage\s*\(/;

  if (!mainImageRegex.test(code)) {
    throw new PreprocessorCompilationError(passName, [{
      line: 0,
      message: 'Missing mainImage function. Each shader pass must define: void mainImage(out vec4 fragColor, in vec2 fragCoord)'
    }]);
  }

  // Check for correct signature: void mainImage(out vec4 ..., vec2 ...)
  // Allow flexible whitespace, ignore parameter names, and make "in" keyword optional
  // This ensures compatibility with Shadertoy-style shaders
  const correctSignatureRegex = /void\s+mainImage\s*\(\s*out\s+vec4\s+\w+\s*,\s*(?:in\s+)?vec2\s+\w+\s*\)/;

  if (!correctSignatureRegex.test(code)) {
    // Find the line number where mainImage is defined for better error reporting
    const lines = code.split('\n');
    let errorLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (mainImageRegex.test(lines[i])) {
        errorLine = i + 1;
        break;
      }
    }

    throw new PreprocessorCompilationError(passName, [{
      line: errorLine,
      message: 'Incorrect mainImage signature. Expected: void mainImage(out vec4 fragColor, vec2 fragCoord)'
    }]);
  }
}

/**
 * Prepares shader code by preprocessing, validating, prepending Common code (if any), and wrapping for WebGL 2.0
 * Used for all shader passes (Image, Buffer A-D) with optional Common code sharing
 *
 * IMPORTANT: Common code is prepended BEFORE preprocessing so that macros and definitions
 * from Common are available when preprocessing the user code. This enables sharing constants
 * and helper functions across all passes.
 */
export function prepareShaderCode(commonCode: string, userCode: string, passName: string): { code: string; userCodeStartLine: number; commonLineCount: number; lineMapping?: Map<number, number> } {
  // Calculate raw Common line count (before preprocessing) for error attribution
  // This helps us determine if a preprocessor error originated in Common or user code
  const rawCommonLineCount = commonCode.trim() ? commonCode.trim().split('\n').length : 0;

  // Combine Common and user code BEFORE preprocessing
  // This ensures macros/defines from Common are available during user code preprocessing
  const combinedRawCode = commonCode.trim()
    ? `${commonCode.trim()}\n\n${userCode}`
    : userCode;

  // Preprocess the combined code as a single unit
  const preprocessResult = preprocessGLSL(combinedRawCode);

  // Handle preprocessor errors - attribute to correct tab based on line number
  // Errors in Common (lines 1-N) are shown in Common tab; user code errors in pass tab
  if (preprocessResult.errors.length > 0) {
    const commonErrors: Array<{ line: number; message: string }> = [];
    const userErrors: Array<{ line: number; message: string }> = [];

    for (const error of preprocessResult.errors) {
      if (commonCode.trim() && error.line <= rawCommonLineCount) {
        // Error is in Common code
        commonErrors.push(error);
      } else {
        // Error is in user code - adjust line number to be relative to user code start
        const adjustedLine = commonCode.trim()
          ? Math.max(1, error.line - rawCommonLineCount - 2) // -2 for the blank lines between Common and user
          : error.line;
        userErrors.push({ line: adjustedLine, message: error.message });
      }
    }

    // Throw error for the first tab that has errors (Common takes precedence)
    if (commonErrors.length > 0) {
      throw new PreprocessorCompilationError('Common', commonErrors);
    }
    if (userErrors.length > 0) {
      throw new PreprocessorCompilationError(passName, userErrors);
    }
  }

  const processedCombinedCode = preprocessResult.code;

  // Validate mainImage signature (after preprocessing so macros are expanded)
  // Note: We validate the entire processed code. If Common mistakenly has mainImage, it will be caught.
  validateMainImageSignature(processedCombinedCode, passName);

  // Calculate processed Common line count for error reporting during GLSL compilation
  // The preprocessed Common may have different line count than raw Common due to macro expansion
  let processedCommonLineCount = 0;
  if (commonCode.trim()) {
    // Count how many lines the Common code became after preprocessing (macros expand, #defines removed)
    const commonPreprocessResult = preprocessGLSL(commonCode.trim());
    processedCommonLineCount = commonPreprocessResult.code.trim()
      ? commonPreprocessResult.code.trim().split('\n').length + 1
      : 0;
  }

  const combinedCode = processedCombinedCode;

  // Extract and handle precision declaration (e.g., "precision mediump float;")
  // Must come after #version in WebGL 2.0, so we extract and reposition it
  const precisionRegex = /^\s*(precision\s+(lowp|mediump|highp)\s+(float|int)\s*;)/im;
  const precisionMatch = combinedCode.match(precisionRegex);

  let cleanedCode = combinedCode;
  let versionAndPrecision = '';

  if (precisionMatch) {
    const precisionDeclaration = precisionMatch[1].trim();
    versionAndPrecision = `#version 300 es\n${precisionDeclaration}`;
    cleanedCode = combinedCode.replace(precisionRegex, '').trim();
  } else {
    versionAndPrecision = '#version 300 es\nprecision mediump float;';
  }

  const wrapper = FRAGMENT_SHADER_WRAPPER.replace('{VERSION_AND_PRECISION}', versionAndPrecision);
  const wrapperLines = wrapper.split('\n');
  const userCodeStartLine = wrapperLines.findIndex(line => line.includes('{USER_CODE}'));
  const finalCode = wrapper.replace('{USER_CODE}', cleanedCode);

  return {
    code: finalCode,
    userCodeStartLine,
    commonLineCount: processedCommonLineCount,
    lineMapping: preprocessResult.lineMapping
  };
}