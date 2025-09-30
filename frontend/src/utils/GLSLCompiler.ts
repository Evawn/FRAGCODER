export interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
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
uniform sampler2D iChannel0;             // input channel 0
uniform sampler2D iChannel1;             // input channel 1
uniform sampler2D iChannel2;             // input channel 2
uniform sampler2D iChannel3;             // input channel 3
uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform float     iChannelTime[4];       // channel playback time (in seconds)

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
 * Parses WebGL shader compilation errors and converts them to user-friendly format
 */
export function parseShaderError(error: string, userCodeStartLine: number = 0): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = error.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    // Common WebGL error patterns
    // Format: "ERROR: 0:15: 'variable' : undeclared identifier"
    const errorMatch = line.match(/ERROR:\s*(\d+):(\d+):\s*(.+)/);
    if (errorMatch) {
      const errorLine = parseInt(errorMatch[2]);
      const message = errorMatch[3].trim();

      // Handle different line number calculation based on how code was prepared
      let lineNumber: number;
      if (userCodeStartLine < 0) {
        // Negative means uniforms were inserted after precision
        // We need to adjust based on the number of uniform lines added
        const uniformLines = 10; // Number of lines added by uniform block
        if (errorLine <= Math.abs(userCodeStartLine)) {
          // Error is before uniform insertion, use original line
          lineNumber = errorLine;
        } else {
          // Error is after uniform insertion, subtract uniform lines
          lineNumber = errorLine - uniformLines;
        }
      } else {
        // Normal case: subtract the wrapper offset
        lineNumber = errorLine - userCodeStartLine;
      }

      errors.push({
        line: Math.max(1, lineNumber),
        message: formatErrorMessage(message),
        type: 'error'
      });
      continue;
    }

    // Warning pattern
    const warningMatch = line.match(/WARNING:\s*(\d+):(\d+):\s*(.+)/);
    if (warningMatch) {
      const errorLine = parseInt(warningMatch[2]);
      const message = warningMatch[3].trim();

      // Handle different line number calculation based on how code was prepared
      let lineNumber: number;
      if (userCodeStartLine < 0) {
        // Negative means uniforms were inserted after precision
        const uniformLines = 10; // Number of lines added by uniform block
        if (errorLine <= Math.abs(userCodeStartLine)) {
          lineNumber = errorLine;
        } else {
          lineNumber = errorLine - uniformLines;
        }
      } else {
        lineNumber = errorLine - userCodeStartLine;
      }

      errors.push({
        line: Math.max(1, lineNumber),
        message: formatErrorMessage(message),
        type: 'warning'
      });
      continue;
    }

    // Generic error without line number
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
      errors.push({
        line: 0,
        message: line.trim(),
        type: 'error'
      });
    }
  }

  return errors;
}

/**
 * Formats error messages to be more user-friendly
 */
export function formatErrorMessage(message: string): string {
  // Remove quotes around identifiers for cleaner messages
  message = message.replace(/['"`]([^'"`]+)['"`]/g, '$1');

  // Common error transformations
  const errorMappings: { [key: string]: string } = {
    'undeclared identifier': 'Variable not declared',
    'no matching overloaded function found': 'Function call with wrong arguments',
    'cannot convert from': 'Type mismatch',
    'syntax error': 'Syntax error',
    'incompatible types in initialization': 'Wrong type in variable initialization',
    'vector field selection out of range': 'Invalid vector component (use xyzw or rgba)',
    'index out of range': 'Array index out of bounds',
    'l-value required': 'Cannot assign to this expression',
    'cannot assign to': 'Cannot assign to constant or expression',
  };

  for (const [pattern, replacement] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(pattern)) {
      // Keep the specific details but prepend with friendly message
      return `${replacement}: ${message}`;
    }
  }

  return message;
}

/**
 * Prepares the shader code by adding necessary uniforms and wrappers for WebGL 2.0
 */
export function prepareShaderCode(userCode: string): { code: string; userCodeStartLine: number } {
  // Check if user has provided a precision declaration and extract it
  const precisionRegex = /^\s*(precision\s+(lowp|mediump|highp)\s+(float|int)\s*;)/im;
  const precisionMatch = userCode.match(precisionRegex);

  let cleanedUserCode = userCode;
  let versionAndPrecision = '';

  // For WebGL 2.0, add version directive and precision
  if (precisionMatch) {
    // Use user's precision declaration
    const precisionDeclaration = precisionMatch[1].trim();
    versionAndPrecision = `#version 300 es\n${precisionDeclaration}`;
    // Remove the precision declaration from user code to avoid duplication
    cleanedUserCode = userCode.replace(precisionRegex, '').trim();
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

  return { code: finalCode, userCodeStartLine };
}

/**
 * Prepares multipass shader code by prepending Common code before wrapping
 * Used for Buffer A-D and Image passes that may share Common code
 */
export function prepareMultipassShaderCode(commonCode: string, userCode: string): { code: string; userCodeStartLine: number } {
  // Prepend common code to user code if it exists
  const combinedCode = commonCode.trim()
    ? `${commonCode.trim()}\n\n${userCode}`
    : userCode;

  // Use existing prepareShaderCode logic for wrapping
  return prepareShaderCode(combinedCode);
}