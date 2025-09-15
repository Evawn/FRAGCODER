import { useEffect, useRef, useState } from 'react';

interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

interface ShaderPlayerProps {
  userCode: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onCompilationResult: (success: boolean, errors: CompilationError[]) => void;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Wrapper template for fragment shaders with common uniforms
const FRAGMENT_SHADER_WRAPPER = `
precision mediump float;

// Standard uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Shadertoy compatibility uniforms
uniform vec2 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// User shader code starts here
{USER_CODE}
`;

/**
 * Creates and compiles a WebGL shader
 */
function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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
function parseShaderError(error: string, userCodeStartLine: number = 0): CompilationError[] {
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
      
      // Subtract the wrapper offset to get user code line number
      const lineNumber = Math.max(1, errorLine - userCodeStartLine);
      
      errors.push({
        line: lineNumber,
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
      
      const lineNumber = Math.max(1, errorLine - userCodeStartLine);
      
      errors.push({
        line: lineNumber,
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
function formatErrorMessage(message: string): string {
  // Remove quotes around identifiers for cleaner messages
  message = message.replace(/['"\`]([^'"\`]+)['"\`]/g, '$1');
  
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
function prepareShaderCode(userCode: string): { code: string; userCodeStartLine: number } {
  // Check if the code already has precision declaration
  const precisionMatch = userCode.match(/precision\s+(lowp|mediump|highp)\s+float\s*;/);
  
  // Count lines in the wrapper before user code
  const wrapperLines = FRAGMENT_SHADER_WRAPPER.split('\n');
  const userCodeStartLine = wrapperLines.findIndex(line => line.includes('{USER_CODE}'));
  
  // If user already declared precision, don't wrap
  if (precisionMatch) {
    // Check if uniforms are already declared
    const hasUniforms = userCode.includes('u_resolution') || userCode.includes('iResolution');
    
    if (!hasUniforms) {
      // Find where to insert uniforms (after precision declaration)
      const precisionIndex = userCode.indexOf(precisionMatch[0]);
      const precisionEndIndex = precisionIndex + precisionMatch[0].length;
      
      // Find the next newline after precision declaration
      let insertIndex = userCode.indexOf('\n', precisionEndIndex);
      if (insertIndex === -1) {
        insertIndex = precisionEndIndex;
      } else {
        insertIndex += 1; // Include the newline
      }
      
      const uniforms = `
// Standard uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Shadertoy compatibility uniforms
uniform vec2 iResolution;
uniform float iTime;
uniform vec4 iMouse;

`;
      
      // Insert uniforms after precision declaration
      const beforePrecision = userCode.substring(0, insertIndex);
      const afterPrecision = userCode.substring(insertIndex);
      const finalCode = beforePrecision + uniforms + afterPrecision;
      
      return { 
        code: finalCode,
        userCodeStartLine: 0 // User code starts at the beginning
      };
    }
    
    return { code: userCode, userCodeStartLine: 0 };
  }
  
  // Replace the placeholder with user code
  const finalCode = FRAGMENT_SHADER_WRAPPER.replace('{USER_CODE}', userCode);
  
  return { code: finalCode, userCodeStartLine };
}

export default function ShaderPlayer({ 
  userCode, 
  isPlaying, 
  onPlayPause, 
  onReset,
  onCompilationResult
}: ShaderPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [compilationSuccess, setCompilationSuccess] = useState<boolean>(false);

  // Cleanup function
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const gl = glRef.current;
    const program = programRef.current;
    
    if (gl && program) {
      gl.useProgram(null);
      
      // Delete shaders
      const shaders = gl.getAttachedShaders(program);
      if (shaders) {
        shaders.forEach(shader => {
          gl.detachShader(program, shader);
          gl.deleteShader(shader);
        });
      }
      
      gl.deleteProgram(program);
      programRef.current = null;
    }
  };

  // Initialize WebGL and compile shaders
  useEffect(() => {
    if (!canvasRef.current || !userCode.trim()) {
      if (!userCode.trim()) {
        onCompilationResult(false, [{
          line: 0,
          message: 'Shader code is empty',
          type: 'error'
        }]);
      }
      return;
    }

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      const errorMsg = 'WebGL is not supported in your browser';
      setError(errorMsg);
      onCompilationResult(false, [{
        line: 0,
        message: errorMsg,
        type: 'error'
      }]);
      return;
    }

    glRef.current = gl as WebGLRenderingContext;
    setError(null);

    // Clean up previous program
    cleanup();

    try {
      // Prepare the shader code with proper wrapper
      const { code: preparedCode, userCodeStartLine } = prepareShaderCode(userCode);
      
      // Create vertex shader
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      if (!vertexShader) {
        throw new Error('Failed to create vertex shader');
      }

      // Create fragment shader
      let fragmentShader: WebGLShader | null = null;
      
      try {
        fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, preparedCode);
      } catch (error: any) {
        // Parse the compilation error
        const compilationErrors = parseShaderError(error.message, userCodeStartLine);
        
        // Clean up vertex shader
        gl.deleteShader(vertexShader);
        
        setError('Shader compilation failed');
        setCompilationSuccess(false);
        onCompilationResult(false, compilationErrors.length > 0 ? compilationErrors : [{
          line: 0,
          message: error.message || 'Shader compilation failed',
          type: 'error'
        }]);
        return;
      }

      // Create and link program
      const program = gl.createProgram();
      if (!program) {
        gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        throw new Error('Failed to create shader program');
      }

      gl.attachShader(program, vertexShader);
      if (fragmentShader) {
        gl.attachShader(program, fragmentShader);
      }
      gl.linkProgram(program);

      const linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!linkSuccess) {
        const error = gl.getProgramInfoLog(program) || 'Unknown linking error';
        const compilationErrors = parseShaderError(error, userCodeStartLine);
        
        // Clean up
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        
        setError('Shader linking failed');
        setCompilationSuccess(false);
        onCompilationResult(false, compilationErrors.length > 0 ? compilationErrors : [{
          line: 0,
          message: 'Shader linking failed: ' + error,
          type: 'error'
        }]);
        return;
      }

      // Success!
      programRef.current = program;
      gl.useProgram(program);

      // Set up geometry (full screen quad)
      const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]), gl.STATIC_DRAW);

      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      // Reset start time when shader changes
      startTimeRef.current = Date.now();
      
      setError(null);
      setCompilationSuccess(true);
      onCompilationResult(true, []);
      
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred during compilation');
      setCompilationSuccess(false);
      onCompilationResult(false, [{
        line: 0,
        message: error.message || 'An unexpected error occurred during compilation',
        type: 'error'
      }]);
    }

    return cleanup;
  }, [userCode, onCompilationResult]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const gl = glRef.current;
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = rect.height - (e.clientY - rect.top); // Flip Y coordinate
      
      // Store mouse position for use in render loop
      if (canvasRef.current) {
        (canvasRef.current as any).mouseX = x;
        (canvasRef.current as any).mouseY = y;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Render loop
  useEffect(() => {
    if (!isPlaying || !compilationSuccess || !programRef.current || !glRef.current || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;

    const render = () => {
      if (!gl || !program || !canvas) return;

      const currentTime = (Date.now() - startTimeRef.current) / 1000.0;

      // Get uniform locations
      const uTimeLocation = gl.getUniformLocation(program, 'u_time');
      const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
      const uMouseLocation = gl.getUniformLocation(program, 'u_mouse');
      const iTimeLocation = gl.getUniformLocation(program, 'iTime');
      const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
      const iMouseLocation = gl.getUniformLocation(program, 'iMouse');

      // Set uniforms
      if (uTimeLocation) gl.uniform1f(uTimeLocation, currentTime);
      if (iTimeLocation) gl.uniform1f(iTimeLocation, currentTime);
      
      if (uResolutionLocation) gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      if (iResolutionLocation) gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
      
      const mouseX = (canvas as any).mouseX || 0;
      const mouseY = (canvas as any).mouseY || 0;
      
      if (uMouseLocation) gl.uniform2f(uMouseLocation, mouseX, mouseY);
      if (iMouseLocation) gl.uniform4f(iMouseLocation, mouseX, mouseY, 0, 0);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, compilationSuccess]);

  // Handle reset
  useEffect(() => {
    const handleReset = () => {
      startTimeRef.current = Date.now();
    };

    // Listen for reset through the onReset prop being called
    return () => {};
  }, [onReset]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Shader Preview
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onPlayPause}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => {
                startTimeRef.current = Date.now();
                onReset();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* WebGL Canvas */}
      <div className="flex-1 bg-black relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {!compilationSuccess && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">No shader compiled yet</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-900/80 text-red-200 p-4 rounded-lg max-w-md">
              <p className="font-semibold mb-2">WebGL Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}