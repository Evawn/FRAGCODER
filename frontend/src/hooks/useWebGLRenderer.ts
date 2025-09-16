import { useEffect, useRef, useState, useCallback } from 'react';
import { WebGLRenderer } from '../utils/WebGLRenderer';
import { prepareShaderCode, parseShaderError } from '../utils/GLSLCompiler';
import type { CompilationError } from '../utils/GLSLCompiler';

interface UseWebGLRendererProps {
  userCode: string;
  isPlaying: boolean;
  onCompilationResult: (success: boolean, errors: CompilationError[]) => void;
}

interface UseWebGLRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  compilationSuccess: boolean;
  error: string | null;
  reset: () => void;
}

export function useWebGLRenderer({
  userCode,
  isPlaying,
  onCompilationResult
}: UseWebGLRendererProps): UseWebGLRendererReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendererReady, setIsRendererReady] = useState(false);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WebGLRenderer();
    const initialized = renderer.initialize(canvasRef.current);

    if (!initialized) {
      setError('WebGL is not supported in your browser');
      onCompilationResult(false, [{
        line: 0,
        message: 'WebGL is not supported in your browser',
        type: 'error'
      }]);
      return;
    }

    rendererRef.current = renderer;
    setIsRendererReady(true);

    // Handle resize
    const handleResize = () => {
      renderer.updateViewport();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      rendererRef.current = null;
      setIsRendererReady(false);
    };
  }, [onCompilationResult]);

  // Compile shader when user code changes or renderer becomes ready
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !isRendererReady) return;

    // Don't compile empty code
    if (!userCode.trim()) {
      setCompilationSuccess(false);
      setError(null);
      onCompilationResult(false, [{
        line: 0,
        message: 'Shader code is empty',
        type: 'error'
      }]);
      return;
    }

    try {
      // Prepare the shader code
      const { code: preparedCode, userCodeStartLine } = prepareShaderCode(userCode);

      // Compile the shader
      renderer.compileShader(preparedCode);

      // Success!
      setCompilationSuccess(true);
      setError(null);
      onCompilationResult(true, []);

      // Note: Playback control is handled by the separate playback useEffect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Shader compilation failed';

      // Parse error for line numbers
      const { userCodeStartLine } = prepareShaderCode(userCode);
      const errors = parseShaderError(errorMessage, userCodeStartLine);

      setCompilationSuccess(false);
      setError('Shader compilation failed');
      onCompilationResult(false, errors.length > 0 ? errors : [{
        line: 0,
        message: errorMessage,
        type: 'error'
      }]);

      // Stop rendering on error
      renderer.stop();
    }
  }, [userCode, onCompilationResult, isRendererReady]);

  // Control playback
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !compilationSuccess) return;

    if (isPlaying) {
      renderer.start();
    } else {
      renderer.stop();
    }
  }, [isPlaying, compilationSuccess]);

  // Reset function
  const reset = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.resetTime();
    }
  }, []);

  return {
    canvasRef,
    compilationSuccess,
    error,
    reset
  };
}