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

// Minimal vertex shader for testing fragment shaders
export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Wrapper template for fragment shaders with common uniforms
export const FRAGMENT_SHADER_WRAPPER = `
precision mediump float;

uniform vec3      iResolution;           // viewport resolution (in pixels)  
uniform float     iTime;                 // shader playback time (in seconds)  
uniform float     iTimeDelta;            // render time (in seconds)  
uniform float     iFrameRate;            // shader frame rate  
uniform int       iFrame;                // shader playback frame  
uniform vec4      iDate;                 // (year, month, day, time in seconds)

// User shader code starts here
{USER_CODE}
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
 * Prepares the shader code by adding necessary uniforms and wrappers
 */
export function prepareShaderCode(userCode: string): { code: string; userCodeStartLine: number } {
  // Count lines in the wrapper before user code
  const wrapperLines = FRAGMENT_SHADER_WRAPPER.split('\n');
  const userCodeStartLine = wrapperLines.findIndex(line => line.includes('{USER_CODE}'));

  // Replace the placeholder with user code
  const finalCode = FRAGMENT_SHADER_WRAPPER.replace('{USER_CODE}', userCode);

  return { code: finalCode, userCodeStartLine };
}
//   if (!shaderCode.trim()) {
//     return {
//       success: false,
//       code: shaderCode,
//       errors: [{
//         line: 0,
//         message: 'Shader code is empty',
//         type: 'error'
//       }]
//     };
//   }

//   // Create a temporary canvas and WebGL context for compilation
//   const canvas = document.createElement('canvas');
//   const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

//   if (!gl) {
//     return {
//       success: false,
//       code: shaderCode,
//       errors: [{
//         line: 0,
//         message: 'WebGL is not supported in your browser',
//         type: 'error'
//       }]
//     };
//   }

//   try {
//     // Prepare the shader code with proper wrapper
//     const { code: preparedCode, userCodeStartLine } = prepareShaderCode(shaderCode);

//     // Create vertex shader (minimal, just for testing)
//     const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
//     if (!vertexShader) {
//       throw new Error('Failed to create vertex shader');
//     }

//     // Try to compile the fragment shader
//     let fragmentShader: WebGLShader | null = null;
//     let compilationErrors: CompilationError[] = [];

//     try {
//       fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, preparedCode);
//     } catch (error: any) {
//       // Parse the compilation error
//       compilationErrors = parseShaderError(error.message, userCodeStartLine);

//       // Clean up vertex shader
//       gl.deleteShader(vertexShader);

//       return {
//         success: false,
//         code: shaderCode,
//         errors: compilationErrors.length > 0 ? compilationErrors : [{
//           line: 0,
//           message: error.message || 'Shader compilation failed',
//           type: 'error'
//         }]
//       };
//     }

//     // Try to link the program to catch additional errors
//     const program = gl.createProgram();
//     if (!program) {
//       gl.deleteShader(vertexShader);
//       if (fragmentShader) gl.deleteShader(fragmentShader);
//       throw new Error('Failed to create shader program');
//     }

//     gl.attachShader(program, vertexShader);
//     if (fragmentShader) {
//       gl.attachShader(program, fragmentShader);
//     }
//     gl.linkProgram(program);

//     const linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
//     if (!linkSuccess) {
//       const error = gl.getProgramInfoLog(program) || 'Unknown linking error';
//       compilationErrors = parseShaderError(error, userCodeStartLine);

//       // Clean up
//       gl.deleteProgram(program);
//       gl.deleteShader(vertexShader);
//       if (fragmentShader) gl.deleteShader(fragmentShader);

//       return {
//         success: false,
//         code: shaderCode,
//         errors: compilationErrors.length > 0 ? compilationErrors : [{
//           line: 0,
//           message: 'Shader linking failed: ' + error,
//           type: 'error'
//         }]
//       };
//     }

//     // Success! Clean up resources
//     gl.deleteProgram(program);
//     gl.deleteShader(vertexShader);
//     if (fragmentShader) gl.deleteShader(fragmentShader);

//     return {
//       success: true,
//       code: shaderCode,
//       errors: []
//     };

//   } catch (error: any) {
//     return {
//       success: false,
//       code: shaderCode,
//       errors: [{
//         line: 0,
//         message: error.message || 'An unexpected error occurred during compilation',
//         type: 'error'
//       }]
//     };
//   }
// }

// Re-export the main function as Compile for backward compatibility
//export const Compile = compile;