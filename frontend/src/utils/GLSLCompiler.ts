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
  constructor(
    public passName: string,
    public preprocessorErrors: Array<{ line: number; message: string }>,
    message?: string
  ) {
    super(message || `Preprocessor errors in ${passName}`);
    this.name = 'PreprocessorCompilationError';
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
    // WebGL error pattern: "ERROR: 0:15: 'variable' : undeclared identifier"
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

    // Warning pattern: "WARNING: 0:15: ..."
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
 */
function calculateMultipassLineNumber(
  compilerLine: number,
  userCodeStartLine: number,
  commonLineCount: number,
  passName: string,
  lineMapping?: Map<number, number>
): number {
  // First, adjust for wrapper code
  let adjustedLine = compilerLine - userCodeStartLine;

  // For non-Common passes, subtract Common code lines if error is after Common section
  if (passName !== 'Common' && commonLineCount > 0 && adjustedLine > commonLineCount) {
    adjustedLine -= commonLineCount;
  }

  // If we have preprocessor line mapping, map back to original source line
  if (lineMapping && lineMapping.has(adjustedLine)) {
    return lineMapping.get(adjustedLine)!;
  }

  return adjustedLine;
}

/**
 * Parses WebGL shader compilation errors for multipass shaders
 * Adjusts line numbers based on Common code prepending and tags errors with pass name
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

      errors.push({
        line: Math.max(1, calculateMultipassLineNumber(compilerLine, userCodeStartLine, commonLineCount, passName, lineMapping)),
        originalLine: compilerLine,
        message: formatErrorMessage(rawMessage),
        type: 'error',
        passName
      });
      continue;
    }

    // Warning pattern: "WARNING: 0:15: ..."
    const warningMatch = line.match(/WARNING:\s*(\d+):(\d+):\s*(.+)/i);
    if (warningMatch) {
      const compilerLine = parseInt(warningMatch[2], 10);
      const rawMessage = warningMatch[3].trim();

      errors.push({
        line: Math.max(1, calculateMultipassLineNumber(compilerLine, userCodeStartLine, commonLineCount, passName, lineMapping)),
        originalLine: compilerLine,
        message: formatErrorMessage(rawMessage),
        type: 'warning',
        passName
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
 */
export function formatErrorMessage(message: string): string {
  // Normalize the message
  let normalized = message.trim();

  // Remove redundant quotes around identifiers
  normalized = normalized.replace(/['"`]([^'"`]+)['"`]/g, '$1');

  // Remove excessive colons and whitespace
  normalized = normalized.replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ');

  // Error pattern mappings - more comprehensive and professional
  const patterns: Array<{ regex: RegExp; format: (match: RegExpMatchArray) => string }> = [
    // Undeclared identifier
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
 * Prepares the shader code by adding necessary uniforms and wrappers for WebGL 2.0
 */
export function prepareShaderCode(userCode: string, passName: string = 'Image'): { code: string; userCodeStartLine: number; lineMapping?: Map<number, number> } {
  // Run preprocessor on user code first
  const preprocessResult = preprocessGLSL(userCode);

  // If there are preprocessor errors, throw them as compilation errors
  if (preprocessResult.errors.length > 0) {
    throw new PreprocessorCompilationError(passName, preprocessResult.errors);
  }

  const processedUserCode = preprocessResult.code;

  // Check if user has provided a precision declaration and extract it
  const precisionRegex = /^\s*(precision\s+(lowp|mediump|highp)\s+(float|int)\s*;)/im;
  const precisionMatch = processedUserCode.match(precisionRegex);

  let cleanedUserCode = processedUserCode;
  let versionAndPrecision = '';

  // For WebGL 2.0, add version directive and precision
  if (precisionMatch) {
    // Use user's precision declaration
    const precisionDeclaration = precisionMatch[1].trim();
    versionAndPrecision = `#version 300 es\n${precisionDeclaration}`;
    // Remove the precision declaration from user code to avoid duplication
    cleanedUserCode = processedUserCode.replace(precisionRegex, '').trim();
  } else {
    // Default precision for WebGL 2.0
    versionAndPrecision = '#version 300 es\nprecision mediump float;';
  }

  // Replace version and precision placeholder in wrapper
  let wrapper = FRAGMENT_SHADER_WRAPPER.replace('{VERSION_AND_PRECISION}', versionAndPrecision);

  // // Replace gl_FragColor with fragColor in user code (WebGL 2.0 uses output variables)
  // cleanedUserCode = cleanedUserCode.replace(/gl_FragColor/g, 'fragColor');

  // Count lines in the wrapper before user code
  const wrapperLines = wrapper.split('\n');
  const userCodeStartLine = wrapperLines.findIndex(line => line.includes('{USER_CODE}'));

  // Replace the user code placeholder with cleaned code
  const finalCode = wrapper.replace('{USER_CODE}', cleanedUserCode);

  return { code: finalCode, userCodeStartLine, lineMapping: preprocessResult.lineMapping };
}

/**
 * Prepares multipass shader code by prepending Common code before wrapping
 * Used for Buffer A-D and Image passes that may share Common code
 */
export function prepareMultipassShaderCode(commonCode: string, userCode: string, passName: string): { code: string; userCodeStartLine: number; commonLineCount: number; lineMapping?: Map<number, number> } {
  // Preprocess common code separately
  let processedCommonCode = '';
  let commonLineCount = 0;

  if (commonCode.trim()) {
    const commonPreprocessResult = preprocessGLSL(commonCode);

    if (commonPreprocessResult.errors.length > 0) {
      throw new PreprocessorCompilationError('Common', commonPreprocessResult.errors);
    }

    processedCommonCode = commonPreprocessResult.code.trim();
    commonLineCount = processedCommonCode ? processedCommonCode.split('\n').length + 1 : 0;
  }

  // Preprocess user code
  const userPreprocessResult = preprocessGLSL(userCode);

  if (userPreprocessResult.errors.length > 0) {
    throw new PreprocessorCompilationError(passName, userPreprocessResult.errors);
  }

  const processedUserCode = userPreprocessResult.code;

  // Prepend processed common code to processed user code
  const combinedCode = processedCommonCode
    ? `${processedCommonCode}\n\n${processedUserCode}`
    : processedUserCode;

  // Now prepare with wrapper (skip preprocessing since we already did it)
  // We need to manually do what prepareShaderCode does without re-preprocessing
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

  let wrapper = FRAGMENT_SHADER_WRAPPER.replace('{VERSION_AND_PRECISION}', versionAndPrecision);
  const wrapperLines = wrapper.split('\n');
  const userCodeStartLine = wrapperLines.findIndex(line => line.includes('{USER_CODE}'));
  const finalCode = wrapper.replace('{USER_CODE}', cleanedCode);

  return {
    code: finalCode,
    userCodeStartLine,
    commonLineCount,
    lineMapping: userPreprocessResult.lineMapping
  };
}